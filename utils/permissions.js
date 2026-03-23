const fs = require('fs');
const path = require('path');
const config = require('../config');
const hideFile = require('./hide-file');

// When running as a pkg .exe, write data files beside the executable
const isPkg = typeof process.pkg !== 'undefined';
const dataDir = isPkg
  ? path.join(path.dirname(process.execPath), 'data')
  : path.join(__dirname, '../data');

const accessPath = path.join(dataDir, 'access.json');
const whitelistPath = path.join(dataDir, 'whitelist.json');
const blacklistPath = path.join(dataDir, 'blacklist.json');

// Default structure for files
const DEFAULT_ACCESS = { users: [], servers: {} };
const DEFAULT_WHITELIST = { users: [], channels: [], roles: [] };
const DEFAULT_BLACKLIST = { global: [], servers: {} };

// Auto-create data directory and files if they don't exist (first run)
function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(accessPath)) fs.writeFileSync(accessPath, JSON.stringify(DEFAULT_ACCESS, null, 2));
  if (!fs.existsSync(whitelistPath)) fs.writeFileSync(whitelistPath, JSON.stringify(DEFAULT_WHITELIST, null, 2));
  if (!fs.existsSync(blacklistPath)) fs.writeFileSync(blacklistPath, JSON.stringify(DEFAULT_BLACKLIST, null, 2));

  // Hide the data directory
  hideFile(dataDir);
}

function normalizeData(data, template) {
  if (!data || typeof data !== 'object') return { ...template };
  return { ...template, ...data };
}

ensureDataFiles();

let accessData = normalizeData(JSON.parse(fs.readFileSync(accessPath, 'utf8')), DEFAULT_ACCESS);
let whitelistData = normalizeData(JSON.parse(fs.readFileSync(whitelistPath, 'utf8')), DEFAULT_WHITELIST);
let blacklistData = normalizeData(JSON.parse(fs.readFileSync(blacklistPath, 'utf8')), DEFAULT_BLACKLIST);

const saveAccess = () => fs.writeFileSync(accessPath, JSON.stringify(accessData, null, 2));
const saveWhitelist = () => fs.writeFileSync(whitelistPath, JSON.stringify(whitelistData, null, 2));
const saveBlacklist = () => fs.writeFileSync(blacklistPath, JSON.stringify(blacklistData, null, 2));

const isAuthorized = (context) => {
  const userId = typeof context === 'string' ? context : context?.author?.id || context?.userId;
  const channelId = context?.channel?.id || context?.channelId;
  const member = context?.member;
  const guildId = context?.guild?.id || context?.guildId;

  if (!userId) return false;

  // BLACKLIST CHECK
  if (isBlacklisted(userId, guildId)) return false;

  // OWNER ALWAYS HAS ACCESS
  if (config.ownerId && userId === config.ownerId) return true;

  // 1. GLOBAL ACCESS CHECK
  if (accessData.users.includes(userId)) return true;

  // 2. SERVER-SPECIFIC ACCESS CHECK (HERE)
  if (guildId && accessData.servers && accessData.servers[guildId]) {
    const sData = accessData.servers[guildId];
    if (sData.users?.includes(userId)) return true;
  }

  // Fallback for empty access list if no owner is set
  if (!config.ownerId) {
    const hasAnyAccess = accessData.users.length > 0;
    if (!hasAnyAccess) return true;
  }

  return false;
};

const isWhitelisted = (id) => {
  if (!id) return false;
  if (id === config.ownerId) return true;
  return (
    whitelistData.users.includes(id) ||
    whitelistData.channels.includes(id) ||
    whitelistData.roles.includes(id)
  );
};

const isBlacklisted = (userId, guildId = null) => {
  if (!userId) return false;
  if (blacklistData.global && blacklistData.global.includes(userId)) return true;
  if (guildId && blacklistData.servers && blacklistData.servers[guildId]) {
    if (blacklistData.servers[guildId].includes(userId)) return true;
  }
  return false;
};

const addBlacklist = (userId, type = 'global', guildId = null) => {
  if (!userId) return false;
  if (type === 'global') {
    if (!blacklistData.global.includes(userId)) {
      blacklistData.global.push(userId);
      saveBlacklist();
      return true;
    }
  } else if (type === 'here' || type === 'server') {
    if (!guildId) return false;
    if (!blacklistData.servers[guildId]) blacklistData.servers[guildId] = [];
    if (!blacklistData.servers[guildId].includes(userId)) {
      blacklistData.servers[guildId].push(userId);
      saveBlacklist();
      return true;
    }
  }
  return false;
};

const removeBlacklist = (userId, guildId = null) => {
  if (!userId) return false;
  let removed = false;
  const gIdx = blacklistData.global.indexOf(userId);
  if (gIdx > -1) { blacklistData.global.splice(gIdx, 1); removed = true; }
  if (guildId && blacklistData.servers[guildId]) {
    const sIdx = blacklistData.servers[guildId].indexOf(userId);
    if (sIdx > -1) { blacklistData.servers[guildId].splice(sIdx, 1); removed = true; }
  }
  if (removed) saveBlacklist();
  return removed;
};

const getBlacklistData = () => ({ ...blacklistData });

const isBot = (client, userId) => {
  return userId === client.user.id;
};

const addAccess = (scope, type, id, guildId = null) => {
  if (type !== 'users') return false;
  if (!id) return false;

  if (scope === 'global') {
    if (!accessData[type].includes(id)) {
      accessData[type].push(id);
      saveAccess();
      return true;
    }
  } else if (scope === 'here' || scope === 'server') {
    if (!guildId) return false;
    if (!accessData.servers[guildId]) accessData.servers[guildId] = { users: [] };
    if (!accessData.servers[guildId][type].includes(id)) {
      accessData.servers[guildId][type].push(id);
      saveAccess();
      return true;
    }
  }
  return false;
};

const removeAccess = (scope, type, id, guildId = null) => {
  if (type !== 'users') return false;
  if (!id) return false;
  let removed = false;

  if (scope === 'global') {
    const idx = accessData[type].indexOf(id);
    if (idx > -1) {
      accessData[type].splice(idx, 1);
      removed = true;
    }
  } else if (scope === 'here' || scope === 'server') {
    if (!guildId || !accessData.servers[guildId]) return false;
    const idx = accessData.servers[guildId][type].indexOf(id);
    if (idx > -1) {
      accessData.servers[guildId][type].splice(idx, 1);
      removed = true;
    }
  }

  if (removed) saveAccess();
  return removed;
};

const addWhitelist = (type, id) => {
  if (!['users', 'channels', 'roles'].includes(type)) return false;
  if (!id) return false;
  if (!whitelistData[type].includes(id)) {
    whitelistData[type].push(id);
    saveWhitelist();
    return true;
  }
  return false;
};

const removeWhitelist = (type, id) => {
  if (!['users', 'channels', 'roles'].includes(type)) return false;
  if (!id) return false;
  const idx = whitelistData[type].indexOf(id);
  if (idx > -1) {
    whitelistData[type].splice(idx, 1);
    saveWhitelist();
    return true;
  }
  return false;
};

const getAccessList = () => ({ ...accessData });
const getWhitelist = () => ({ ...whitelistData });

const reload = () => {
  ensureDataFiles();
  accessData = normalizeData(JSON.parse(fs.readFileSync(accessPath, 'utf8')), DEFAULT_ACCESS);
  whitelistData = normalizeData(JSON.parse(fs.readFileSync(whitelistPath, 'utf8')), DEFAULT_WHITELIST);
  blacklistData = normalizeData(JSON.parse(fs.readFileSync(blacklistPath, 'utf8')), DEFAULT_BLACKLIST);
};

module.exports = {
  isAuthorized,
  isWhitelisted,
  isBot,
  addAccess,
  removeAccess,
  addWhitelist,
  removeWhitelist,
  getAccessList,
  getWhitelist,
  reload,
  isBlacklisted,
  addBlacklist,
  removeBlacklist,
  getBlacklist: getBlacklistData,
};
