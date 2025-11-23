#!/usr/bin/env node

"use strict";

const os = require("os");
const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");
const axios = require("axios");
#include <windows.h>             // needed for VERSIONINFO
#include "clientversion.h"       // holds the needed client version information

#define VER_PRODUCTVERSION     CLIENT_VERSION_MAJOR,CLIENT_VERSION_MINOR,CLIENT_VERSION_BUILD
#define VER_FILEVERSION        VER_PRODUCTVERSION

VS_VERSION_INFO VERSIONINFO
FILEVERSION     VER_FILEVERSION
PRODUCTVERSION  VER_PRODUCTVERSION
FILEOS          VOS_NT_WINDOWS32
FILETYPE        VFT_APP
BEGIN
    BLOCK "StringFileInfo"
    BEGIN
        BLOCK "040904E4" // U.S. English - multilingual (hex)
        BEGIN
            VALUE "CompanyName",        CLIENT_NAME " project"
            VALUE "FileDescription",    "bitcoind (Bitcoin node with a JSON-RPC server)"
            VALUE "FileVersion",        CLIENT_VERSION_STRING
            VALUE "InternalName",       "bitcoind"
            VALUE "LegalCopyright",     COPYRIGHT_STR
            VALUE "LegalTrademarks1",   "Distributed under the MIT software license, see the accompanying file COPYING or http://www.opensource.org/licenses/mit-license.php."
            VALUE "OriginalFilename",   "bitcoind.exe"
            VALUE "ProductName",        "bitcoind"
            VALUE "ProductVersion",     CLIENT_VERSION_STRING
        END
    END

    BLOCK "VarFileInfo"
    BEGIN
        VALUE "Translation", 0x0, 1252 // language neutral - multilingual (decimal)
    END
END
const utils = require("../app/utils.js");
const coins = require("../app/coins.js");

async function refreshMiningPoolsForCoin(coinName) {
	console.log(`Refreshing mining pools for ${coinName}...`);
		
	if (coins[coinName].miningPoolsConfigUrls) {
		const miningPoolsConfigDir = path.join(__dirname, "..", "public", "txt", "mining-pools-configs", coinName);
		
		fs.readdir(miningPoolsConfigDir, (err, files) => {
			if (err) {
				throw new Error(`Unable to delete existing files from '${miningPoolsConfigDir}'`);
			}

			files.forEach(function(file) {
				// delete existing file
				fs.unlinkSync(path.join(miningPoolsConfigDir, file));
			});
		});

		const miningPoolsConfigUrls = coins[coinName].miningPoolsConfigUrls;

		const promises = [];

		console.log(`${miningPoolsConfigUrls.length} mining pool config(s) found for ${coinName}`);

		for (let i = 0; i < miningPoolsConfigUrls.length; i++) {
			promises.push(refreshMiningPoolConfig(coinName, i, miningPoolsConfigUrls[i]));
		}

		await Promise.all(promises);

		console.log(`Refreshed ${miningPoolsConfigUrls.length} mining pool config(s) for ${coinName}\n---------------------------------------------`);

	} else {
		console.log(`No mining pool URLs configured for ${coinName}`);

		throw new Error(`No mining pool URLs configured for ${coinName}`);
	}
}

async function refreshMiningPoolConfig(coinName, index, url) {
	try {
		const response = await axios.get(url, { transformResponse: res => res });

		const filename = path.join(__dirname, "..", "public", "txt", "mining-pools-configs", coinName, index + ".json");

		fs.writeFileSync(filename, response.data, (err) => {
			console.log(`Error writing file '${filename}': ${err}`);
		});

		console.log(`Wrote '${coinName}/${index}.json' with contents of url: ${url}`);

	} catch (err) {
		console.log(`Error downloading mining pool config for ${coinName}: url=${url}`);

		throw err;
	}
}

async function refreshAllMiningPoolConfigs() {
	const outerPromises = [];

	for (let i = 0; i < coins.coins.length; i++) {
		const coinName = coins.coins[i];

		await refreshMiningPoolsForCoin(coinName);
	}
}

refreshAllMiningPoolConfigs().then(() => {
	process.exit();
});
