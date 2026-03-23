const fs = require('fs');
const path = require('path');
const config = require('../config');
const hideFile = require('./hide-file');

const isPkg = typeof process.pkg !== 'undefined';
const dataDir = isPkg
    ? path.join(path.dirname(process.execPath), 'data')
    : path.join(__dirname, '../data');

const npPath = path.join(dataDir, 'noprefix.json');
const DEFAULT_NP = { users: [] };

function ensureFile() {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(npPath)) fs.writeFileSync(npPath, JSON.stringify(DEFAULT_NP, null, 2));
    hideFile(dataDir);
}

ensureFile();

let npData;
try {
    npData = JSON.parse(fs.readFileSync(npPath, 'utf8'));
    if (!Array.isArray(npData.users)) npData.users = [];
} catch (err) {
    npData = { users: [] };
}

function save() {
    fs.writeFileSync(npPath, JSON.stringify(npData, null, 2));
}

function hasNoPrefix(userId) {
    if (!userId) return false;
    if (userId === config.ownerId) return true;
    return npData.users.includes(userId);
}

function addNoPrefix(userId) {
    if (!userId) return false;
    if (!npData.users.includes(userId)) {
        npData.users.push(userId);
        save();
        return true;
    }
    return false;
}

function removeNoPrefix(userId) {
    if (!userId) return false;
    const index = npData.users.indexOf(userId);
    if (index > -1) {
        npData.users.splice(index, 1);
        save();
        return true;
    }
    return false;
}

function getNoPrefixList() {
    return [...npData.users];
}

module.exports = {
    hasNoPrefix,
    addNoPrefix,
    removeNoPrefix,
    getNoPrefixList
};
