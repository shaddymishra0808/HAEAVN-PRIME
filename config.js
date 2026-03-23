const path = require('path');
const tokenStore = require('./utils/token-store');

// Load .env only if it exists
const isPkg = typeof process.pkg !== 'undefined';
const envPath = isPkg
  ? path.join(path.dirname(process.execPath), '.env')
  : path.join(__dirname, '.env');

// Use override: true so that the .env file takes precedence over any stale process.env variables in the terminal
require('dotenv').config({ path: envPath, override: true });

// Load from token-store (JSON)
const savedToken = tokenStore.loadToken();
const savedOwnerId = tokenStore.loadOwnerId();

module.exports = {
  prefix: process.env.PREFIX || '+',
  // Priority: saved-token.json → .env → process.env
  token: savedToken || process.env.BOT_TOKEN,
  clientId: process.env.CLIENT_ID,
  ownerId: savedOwnerId || process.env.OWNER_ID,
};
