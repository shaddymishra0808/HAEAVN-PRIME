const fs = require('fs');
const path = require('path');
const hideFile = require('./hide-file');

// When running as pkg .exe, save beside the executable; otherwise beside index.js
const isPkg = typeof process.pkg !== 'undefined';
const storeDir = isPkg ? path.dirname(process.execPath) : path.join(__dirname, '..');
const storePath = path.join(storeDir, 'saved-token.json');
const envPath = path.join(storeDir, '.env');
const batPath = path.join(storeDir, 'run.bat');
const ps1Path = path.join(storeDir, 'start.ps1');

// ─── .env ─────────────────────────────────────────────────────────────────────
// ─── .env ─────────────────────────────────────────────────────────────────────
// ─── .env Helper ──────────────────────────────────────────────────────────────
function syncEnv(content, key, value) {
  const regex = new RegExp(`^\\s*${key}\\s*=.*$`, 'm');
  let newContent = content.replace(/\r\n/g, '\n');

  if (value) {
    if (regex.test(newContent)) {
      newContent = newContent.replace(regex, `${key}=${value}`);
    } else {
      newContent = `${key}=${value}\n${newContent.trim()}`;
    }
  } else {
    // If value is null/falsy, remove the line to clear it
    newContent = newContent.replace(regex, '').trim();
  }
  return newContent.trim();
}

// ─── Shell Scripts Helpers ──────────────────────────────────────────────────
function syncShellScripts(dir, token) {
  try {
    const bPath = path.join(dir, 'run.bat');
    const pPath = path.join(dir, 'start.ps1');

    if (fs.existsSync(bPath)) {
      let content = fs.readFileSync(bPath, 'utf8');
      content = content.replace(/^\s*set\s+BOT_TOKEN\s*=.*$/m, `set BOT_TOKEN=${token || ''}`);
      fs.writeFileSync(bPath, content, 'utf8');
    }

    if (fs.existsSync(pPath)) {
      let content = fs.readFileSync(pPath, 'utf8');
      content = content.replace(/^\s*\$env:BOT_TOKEN\s*=\s*".*"/m, `$env:BOT_TOKEN = "${token || ''}"`);
      fs.writeFileSync(pPath, content, 'utf8');
    }
  } catch { }
}

// ─── Public API ───────────────────────────────────────────────────────────────
function loadToken() {
  try {
    if (fs.existsSync(storePath)) {
      const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      return data.token || null;
    }
  } catch { }
  return null;
}

function loadOwnerId() {
  try {
    if (fs.existsSync(storePath)) {
      const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      return data.ownerId || null;
    }
  } catch { }
  return null;
}

function isFirstRun() {
  try {
    // Check JSON store first
    let hasJSON = false;
    if (fs.existsSync(storePath)) {
      const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      if (data.token && data.ownerId) hasJSON = true;
    }

    // Check .env as fallback
    let hasEnv = false;
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const hasToken = /^\s*BOT_TOKEN\s*=..*$/m.test(content);
      const hasOwner = /^\s*OWNER_ID\s*=\d{17,20}/m.test(content);
      if (hasToken && hasOwner) hasEnv = true;
    }

    return !(hasJSON || hasEnv);
  } catch { }
  return true;
}

function saveFilesToDir(dir, toSave) {
  try {
    const sPath = path.resolve(dir, 'saved-token.json');
    const ePath = path.resolve(dir, '.env');

    console.log(`  ${require('chalk').gray('○')} Synchronizing in: ${chalk.white(dir)}`);

    // 1. JSON
    fs.writeFileSync(sPath, JSON.stringify(toSave, null, 2), 'utf8');

    // 2. .env (ALWAYS update or clear)
    if (fs.existsSync(ePath)) {
      let content = fs.readFileSync(ePath, 'utf8');
      content = syncEnv(content, 'BOT_TOKEN', toSave.token);
      content = syncEnv(content, 'OWNER_ID', toSave.ownerId);
      fs.writeFileSync(ePath, content + '\n', 'utf8');
    } else if (toSave.token || toSave.ownerId) {
      // Create it if it doesn't exist but we have info
      let content = '';
      if (toSave.token) content += `BOT_TOKEN=${toSave.token}\n`;
      if (toSave.ownerId) content += `OWNER_ID=${toSave.ownerId}\n`;
      fs.writeFileSync(ePath, content.trim() + '\n', 'utf8');
    }

    // 3. Shell Scripts
    syncShellScripts(dir, toSave.token);

    // Hide files (Windows only)
    hideFile(sPath);
    hideFile(ePath);
  } catch (err) {
    console.log(`  ${require('chalk').red('✗')} Write Error at ${dir}: ${err.message}`);
  }
}

function saveToken(token, ownerId) {
  try {
    const toSave = {
      token: token || null,
      ownerId: ownerId || null,
    };

    console.log(`\n  ${require('chalk').cyan('➜')} Synchronizing credentials...`);

    // 1. Save to primary storeDir (Current context)
    if (!fs.existsSync(storeDir)) fs.mkdirSync(storeDir, { recursive: true });
    saveFilesToDir(storeDir, toSave);

    // 2. Also Update Dist folder specifically if we are in Root (Dev mode)
    if (!isPkg) {
      const distPath = path.join(storeDir, 'dist');
      if (fs.existsSync(distPath)) saveFilesToDir(distPath, toSave);
    }

    console.log(`  ${require('chalk').green('✓')} Saved successfully! (Root & Dist now in sync)`);
    return true;
  } catch (err) {
    console.log(`  ${require('chalk').red('✗')} Failed to sync credentials: ${err.message}`);
    return false;
  }
}

function clearToken() {
  try {
    // Thorough clear for all possible storage places
    if (fs.existsSync(storePath)) fs.unlinkSync(storePath);

    // Also clear .env file contents but keep the file maybe? Or just remove lines.
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf8');
      content = syncEnv(content, 'BOT_TOKEN', null);
      content = syncEnv(content, 'OWNER_ID', null);
      fs.writeFileSync(envPath, content + '\n', 'utf8');
    }
  } catch { }
}

module.exports = { loadToken, loadOwnerId, saveToken, clearToken, isFirstRun };
