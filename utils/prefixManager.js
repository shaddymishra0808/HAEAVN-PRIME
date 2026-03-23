const fs = require('fs');
const path = require('path');
const config = require('../config');
const hideFile = require('./hide-file');

const isPkg = typeof process.pkg !== 'undefined';
const dataDir = isPkg
    ? path.join(path.dirname(process.execPath), 'data')
    : path.join(__dirname, '../data');

const prefixPath = path.join(dataDir, 'prefixes.json');

function ensureFile() {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(prefixPath)) fs.writeFileSync(prefixPath, JSON.stringify({}, null, 2));
    hideFile(dataDir);
}

ensureFile();

let prefixData;
try {
    prefixData = JSON.parse(fs.readFileSync(prefixPath, 'utf8'));
} catch (err) {
    prefixData = {};
}

function save() {
    fs.writeFileSync(prefixPath, JSON.stringify(prefixData, null, 2));
}

function getPrefix(guildId) {
    if (!guildId) return config.prefix;
    return prefixData[guildId] || config.prefix;
}

function setPrefix(guildId, prefix) {
    if (!guildId) return false;
    if (prefix === config.prefix) {
        delete prefixData[guildId];
    } else {
        prefixData[guildId] = prefix;
    }
    save();
    return true;
}

module.exports = {
    getPrefix,
    setPrefix
};
