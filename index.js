const http = require('http');
const { Client, GatewayIntentBits, Partials, Options, EmbedBuilder } = require('discord.js');
const readline = require('readline');
const chalk = require('chalk');
const ora = require('ora');
const cliProgress = require('cli-progress');
const config = require('./config');
const logger = require('./utils/logger');
const { loadCommands } = require('./utils/loader');
const permissions = require('./utils/permissions');
const noprefix = require('./utils/noprefix');
const prefixManager = require('./utils/prefixManager');
const tokenStore = require('./utils/token-store');
const { resolveEmojis } = require('./utils/emojis');

// ─── Command Registry ─────────────────────────────────────────────────────────
const commands = new Map();

// ─── Crash Protection ─────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
});
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason?.message || reason}`);
});

// ─── Resilient readline (recreates if stdin closes unexpectedly) ──────────────
let rl = null;

function getRL() {
  if (!rl || rl.closed) {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.on('close', () => {
      rl = null;
    });
  }
  return rl;
}

function ask(question) {
  return new Promise((resolve) => {
    const iface = getRL();
    iface.question(question, (ans) => resolve(ans));
  });
}

// Graceful shutdown only on explicit signals
process.on('SIGINT', () => { console.log(chalk.red('\n  [!] SIGINT received. Shutting down.')); process.exit(0); });
process.on('SIGTERM', () => { console.log(chalk.red('\n  [!] SIGTERM received. Shutting down.')); process.exit(0); });

// ─── Animation & Boot Sequence ────────────────────────────────────────────────
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let hasBooted = false;

// Custom Hex Gradient Generator
function gradientString(text, startHex, endHex) {
  const sR = parseInt(startHex.slice(1, 3), 16), sG = parseInt(startHex.slice(3, 5), 16), sB = parseInt(startHex.slice(5, 7), 16);
  const eR = parseInt(endHex.slice(1, 3), 16), eG = parseInt(endHex.slice(3, 5), 16), eB = parseInt(endHex.slice(5, 7), 16);
  let res = '';
  for (let i = 0; i < text.length; i++) {
    const ratio = Math.max(0, Math.min(1, i / (text.length - 1 || 1)));
    const r = Math.round(sR + (eR - sR) * ratio);
    const g = Math.round(sG + (eG - sG) * ratio);
    const b = Math.round(sB + (eB - sB) * ratio);
    res += chalk.rgb(r, g, b)(text[i]);
  }
  return res;
}

const neonPink = '#ff007f';
const neonBlue = '#00f0ff';
const neonPurple = '#bd00ff';

async function runBootAnimation() {
  if (hasBooted) return;
  hasBooted = true;
  console.clear();

  console.log(gradientString('  [SYSTEM BOOT INITIATED] \n', neonPink, neonBlue));

  const bar = new cliProgress.SingleBar({
    format: `  ${chalk.cyan('{bar}')} | {percentage}% | {task}`,
    barCompleteChar: '█',
    barIncompleteChar: '░',
    hideCursor: true,
  });

  bar.start(100, 0, { task: 'Waking Core...' });

  const tasks = ['Loading Handlers...', 'Securing Protocols...', 'Establishing Network...', 'Bypassing Node...', 'Finalizing Sequence...'];
  let currentVal = 0;

  for (let t = 0; t < tasks.length; t++) {
    for (let j = 0; j < 5; j++) {
      currentVal += 4;
      bar.update(currentVal, { task: tasks[t] });
      await sleep(10);
    }
  }
  bar.update(100, { task: chalk.green('System Ready.') });
  bar.stop();
  console.log('');
  await sleep(10);
}

// ─── Banner ───────────────────────────────────────────────────────────────────
async function printBanner() {
  console.clear();

  const title = [
    "  ██╗  ██╗ █████╗ ███╗   ██╗ ██████╗  ██████╗ ██╗   ██╗████████╗",
    "  ██║  ██║██╔══██╗████╗  ██║██╔════╝ ██╔═══██╗██║   ██║╚══██╔══╝",
    "  ███████║███████║██╔██╗ ██║██║  ███╗██║   ██║██║   ██║   ██║   ",
    "  ██╔══██║██╔══██║██║╚██╗██║██║   ██║██║   ██║██║   ██║   ██║   ",
    "  ██║  ██║██║  ██║██║ ╚████║╚██████╔╝╚██████╔╝╚██████╔╝   ██║   ",
    "  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝  ╚═════╝  ╚═════╝    ╚═╝   ",
    "                                                                ",
    "         ██╗  ██╗███████╗█████╗  ██╗   ██╗███████╗███╗   ██╗    ",
    "         ██║  ██║██╔════╝██╔══██╗██║   ██║██╔════╝████╗  ██║    ",
    "         ███████║█████╗  ███████║██║   ██║█████╗  ██╔██╗ ██║    ",
    "         ██╔══██║██╔══╝  ██╔══██║╚██╗ ██╔╝██╔══╝  ██║╚██╗██║    ",
    "         ██║  ██║███████╗██║  ██║ ╚████╔╝ ███████╗██║ ╚████║    ",
    "         ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═══╝    "
  ];

  for (const line of title) {
    console.log(gradientString(line, neonBlue, neonPurple));
    await sleep(20);
  }

  const BOX_WIDTH = 69;
  const CONTENT_WIDTH = BOX_WIDTH - 4; // 2 leading spaces + 2 edge characters

  const header = gradientString(`  ╭${'═'.repeat(CONTENT_WIDTH)}╮`, neonPink, neonBlue);
  const footer = gradientString(`  ╰${'═'.repeat(CONTENT_WIDTH)}╯`, neonPink, neonBlue);
  const edge = chalk.hex(neonPink)('│');
  const edgeR = chalk.hex(neonBlue)('│');

  const center = (text) => {
    const raw = String(text);
    const truncated = raw.length > CONTENT_WIDTH ? `${raw.slice(0, CONTENT_WIDTH - 1)}…` : raw;
    const pad = CONTENT_WIDTH - truncated.length;
    const left = Math.floor(pad / 2);
    const right = pad - left;
    return ' '.repeat(left) + truncated + ' '.repeat(right);
  };

  console.log('');
  console.log(header);
  console.log(`  ${edge}${chalk.white.bold(center('HANGOUT HEAVEN v3.0 ELITE'))}${edgeR}`);
  console.log(`  ${edge}${chalk.green(center('Ultra Fast Execution Mode Enabled'))}${edgeR}`);
  console.log(`  ${edge}${chalk.gray(center('Node.js  •  discord.js v14  •  cli-progress'))}${edgeR}`);
  console.log(gradientString(`  ├${'═'.repeat(CONTENT_WIDTH)}┤`, neonPink, neonBlue));
  console.log(`  ${edge}${' '.repeat(CONTENT_WIDTH)}${edgeR}`);
  console.log(`  ${edge}${gradientString(center('Developed & Designed by Zabro'), neonBlue, neonPink)}${edgeR}`);
  console.log(`  ${edge}${' '.repeat(CONTENT_WIDTH)}${edgeR}`);
  console.log(footer);
  console.log('');
}

// ─── Server Selection ─────────────────────────────────────────────────────────
async function selectServer(client) {
  const guilds = [...client.guilds.cache.values()];

  if (guilds.length === 0) {
    logger.error('Bot is not in any servers. Invite the bot first.');
    const retry = await ask(chalk.yellow('  Press Enter to try again, or type "back" to switch token: '));
    if (retry.trim().toLowerCase() === 'back') return null;
    return selectServer(client);
  }

  console.log(chalk.cyan.bold('  AVAILABLE SERVERS'));
  logger.divider();
  guilds.forEach((g, i) => {
    console.log(`  ${chalk.green(`[${i + 1}]`)} ${chalk.white(g.name)} ${chalk.gray(`— ${g.id}`)} ${chalk.yellow(`(${g.memberCount} members)`)}`);
  });
  logger.divider();
  console.log('');

  const answer = await ask(chalk.cyan('  Select server number: '));
  const idx = parseInt(answer.trim()) - 1;
  if (isNaN(idx) || idx < 0 || idx >= guilds.length) {
    logger.error('Invalid selection. Try again.');
    return selectServer(client);
  }
  const guild = guilds[idx];
  console.log('');
  console.log(chalk.green(`  ✓ CONNECTED TO: ${chalk.white.bold(guild.name)}`));
  logger.divider();
  return guild;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────
function printMenu(client, guild) {
  const botTag = client.user.tag;
  const guildName = guild.name;
  const ping = client.ws.ping === -1 ? 'Calculating...' : `${client.ws.ping}ms`;

  const neonBlue = '#00f0ff';
  const neonPurple = '#bd00ff';

  const tHeader = gradientString('  ╭── HANGOUT HEAVEN MENU ──────────────────────────────────────────╮', neonBlue, neonPurple);
  const tFooter = gradientString('  ╰─────────────────────────────────────────────────────────────────╯', neonBlue, neonPurple);
  const edgeL = chalk.hex(neonBlue)('│');
  const edgeR = chalk.hex(neonPurple)('│');

  console.log('');
  console.log(chalk.bold(tHeader));

  const row = (i1, l1, c1, i2, l2, c2) => {
    const renderItem = (idx, label, color) => {
      const idxStr = `[${idx}]`;
      const fixedIdx = idxStr.padEnd(5);
      const fixedLabel = label.padEnd(24);
      return `${chalk[color || 'white'](fixedIdx)} ${chalk.white(fixedLabel)}`;
    };

    const left = renderItem(i1, l1, c1);
    const right = i2 ? renderItem(i2, l2, c2) : ' '.repeat(30);

    return `  ${edgeL}  ${left} ${right}  ${edgeR}`;
  };

  console.log(row('1', 'Create channels', 'cyan', '8', 'Reload commands', 'green'));
  console.log(row('2', 'Create roles', 'cyan', '9', 'System stats', 'green'));
  console.log(row('3', 'Server information', 'cyan', 's', 'Switch server', 'yellow'));
  console.log(row('4', 'Member list', 'cyan', 't', 'Switch bot token', 'yellow'));
  console.log(row('5', 'Send message', 'cyan', '6', 'Show access list', 'green'));
  console.log(row('d1', 'Delete all channels', 'red', '7', 'Show whitelist', 'green'));
  console.log(row('a', 'Manage access/white', 'magenta', 'd2', 'Delete all roles', 'red'));
  console.log(row('d3', 'NUKE SYSTEM', 'red', 'mb', 'Mass Ban', 'red'));
  console.log(row('sp', 'Spam a channel', 'magenta', 'sa', 'Spam ALL channels', 'magenta'));
  console.log(row('cs', 'Clean Spam', 'magenta', 'bp', 'Bot Profile', 'cyan'));
  console.log(row('bos', 'Bot Owner Status', 'cyan', 'bs', 'Bot Status', 'cyan'));
  console.log(row('es', 'Emoji Sync', 'magenta', 'bl', 'Blacklist User', 'red'));
  console.log(row('st', 'Steal Emoji', 'blue', '0', 'Exit', 'red'));



  console.log(chalk.bold(tFooter));

  const maxBotInfo = 67;
  const ownerStr = client.ownerName || config.ownerId || 'Not Set';
  const rawBotInfo = ` ❖ Bot: ${botTag} | ❖ Owner: ${ownerStr} | ❖ Ping: ${ping}`;
  const botInfo = gradientString(
    rawBotInfo.length > maxBotInfo ? `${rawBotInfo.slice(0, maxBotInfo - 3)}...` : rawBotInfo.padEnd(maxBotInfo),
    neonPurple,
    neonBlue
  );
  console.log(`  ${botInfo}`);
  console.log('');
}


// ─── Access / Whitelist ───────────────────────────────────────────────────────
function showAccessList() {
  const list = permissions.getAccessList();
  logger.divider();
  console.log(chalk.cyan.bold('  ACCESS LIST'));
  logger.divider();

  console.log(chalk.yellow('  Users:'));
  if (list.users.length === 0) console.log(chalk.gray('    No additional users. Only owner has access.'));
  else list.users.forEach((id, i) => console.log(`    ${chalk.green(`${i + 1}.`)} ${chalk.white(id)}`));

  console.log('');
  console.log(chalk.yellow('  Channels:'));
  if (list.channels.length === 0) console.log(chalk.gray('    No access channels configured.'));
  else list.channels.forEach((id, i) => console.log(`    ${chalk.green(`${i + 1}.`)} ${chalk.white(id)}`));

  console.log('');
  console.log(chalk.yellow('  Roles:'));
  if (list.roles.length === 0) console.log(chalk.gray('    No access roles configured.'));
  else list.roles.forEach((id, i) => console.log(`    ${chalk.green(`${i + 1}.`)} ${chalk.white(id)}`));

  logger.divider();
}


function showWhitelist() {
  const list = permissions.getWhitelist();
  logger.divider();
  console.log(chalk.cyan.bold('  WHITELIST'));
  logger.divider();

  console.log(chalk.yellow('  Users:'));
  if (list.users.length === 0) console.log(chalk.gray('    Whitelist is empty.'));
  else list.users.forEach((id, i) => console.log(`    ${chalk.green(`${i + 1}.`)} ${chalk.white(id)}`));

  console.log('');
  console.log(chalk.yellow('  Channels:'));
  if (list.channels.length === 0) console.log(chalk.gray('    No whitelisted channels.'));
  else list.channels.forEach((id, i) => console.log(`    ${chalk.green(`${i + 1}.`)} ${chalk.white(id)}`));

  console.log('');
  console.log(chalk.yellow('  Roles:'));
  if (list.roles.length === 0) console.log(chalk.gray('    No whitelisted roles.'));
  else list.roles.forEach((id, i) => console.log(`    ${chalk.green(`${i + 1}.`)} ${chalk.white(id)}`));

  logger.divider();
}

async function manageAccessWhitelist(currentGuildId) {
  let step = 1;
  let choice, typeInput, id, guildScope, selected;

  while (step >= 1 && step <= 3) {
    if (step === 1) {
      logger.divider();
      console.log(chalk.cyan.bold('  ACCESS / WHITELIST MANAGER'));
      logger.divider();
      console.log(chalk.white('  1) Add to access list'));
      console.log(chalk.white('  2) Remove from access list'));
      console.log(chalk.white('  3) Add to whitelist'));
      console.log(chalk.white('  4) Remove from whitelist'));
      console.log(chalk.gray('  0) Cancel (Back to menu)'));
      logger.divider();

      choice = (await ask(chalk.cyan('  Select option: '))).trim();
      if (!choice || choice === '0' || choice.toLowerCase() === 'b' || choice.toLowerCase() === 'back') {
        step--; continue;
      }

      const mapAction = {
        '1': { fn: permissions.addAccess, label: 'Access', action: 'add' },
        '2': { fn: permissions.removeAccess, label: 'Access', action: 'remove' },
        '3': { fn: permissions.addWhitelist, label: 'Whitelist', action: 'add' },
        '4': { fn: permissions.removeWhitelist, label: 'Whitelist', action: 'remove' },
      };

      selected = mapAction[choice];
      if (!selected) { logger.error('Invalid selection.'); continue; }
      step = 2;
    } else if (step === 2) {
      const typeInputRaw = await ask(chalk.cyan('  Type (user/channel/role) or "b" to back: '));
      typeInput = typeInputRaw.trim().toLowerCase();
      if (typeInput === 'b' || typeInput === 'back') { step--; continue; }

      const typeMap = { user: 'users', channel: 'channels', role: 'roles' };
      const typeKey = typeMap[typeInput];
      if (!typeKey) {
        logger.error('Invalid type. Please choose user, channel or role.');
        continue;
      }

      // Ask for scope if managing Access
      if (selected.label === 'Access') {
        process.stdout.write('\n');
        console.log(chalk.yellow('  Select Scope:'));
        console.log(chalk.white('  1) This server only (HERE) 🔒'));
        console.log(chalk.white('  2) Global (ALL servers) 🌐'));
        const sc = (await ask(chalk.cyan('  Choice (1/2): '))).trim();
        guildScope = sc === '2' ? 'global' : 'here';
      }

      step = 3;
    } else if (step === 3) {
      const idRaw = await ask(chalk.cyan(`  ${selected.action === 'add' ? 'Add' : 'Remove'} ${selected.label} ID (or "b" to back): `));
      id = idRaw.trim();
      if (id.toLowerCase() === 'b' || id.toLowerCase() === 'back') { step--; continue; }

      if (!id) {
        logger.error('No ID provided.');
        continue;
      }
      step = 4;
    }
  }

  if (step < 1) return;

  const typeMap = { user: 'users', channel: 'channels', role: 'roles' };
  const typeKey = typeMap[typeInput];
  const ok = selected.label === 'Access'
    ? selected.fn(guildScope, typeKey, id, currentGuildId)
    : selected.fn(typeKey, id);

  if (ok) {
    const scopeNote = selected.label === 'Access' ? ` [${guildScope.toUpperCase()}]` : '';
    logger.success(`${selected.label}${scopeNote} ${selected.action === 'add' ? 'added to' : 'removed from'} ${typeInput} list: ${id}`);
  } else {
    logger.warn(`${selected.label} ${selected.action === 'add' ? 'already exists' : 'not found'} for ID: ${id}`);
  }
}

// ─── Blacklist Manager ────────────────────────────────────────────────────────
async function manageBlacklist(currentGuildId) {
  logger.divider();
  console.log(chalk.red.bold('  BLACKLIST MANAGER'));
  logger.divider();

  const bl = permissions.getBlacklist();
  console.log(chalk.yellow('  Global Blacklisted:'));
  if (bl.global.length === 0) console.log(chalk.gray('    None.'));
  else bl.global.forEach((id, i) => console.log(`    ${chalk.red(`${i + 1}.`)} ${chalk.white(id)}`));

  if (currentGuildId && bl.servers && bl.servers[currentGuildId]) {
    console.log(chalk.yellow(`\n  Server Blacklisted (${currentGuildId}):`));
    bl.servers[currentGuildId].forEach((id, i) => console.log(`    ${chalk.red(`${i + 1}.`)} ${chalk.white(id)}`));
  }
  logger.divider();

  console.log(chalk.white('  1) Blacklist a user'));
  console.log(chalk.white('  2) Remove from blacklist'));
  console.log(chalk.gray('  0) Cancel'));
  logger.divider();

  const choice = (await ask(chalk.cyan('  Select option: '))).trim();
  if (!choice || choice === '0') return;

  if (choice === '1') {
    const userId = (await ask(chalk.cyan('  User ID to blacklist: '))).trim();
    if (!userId) { logger.error('No ID provided.'); return; }

    process.stdout.write('\n');
    console.log(chalk.yellow('  Select Scope:'));
    console.log(chalk.white('  1) This server only (HERE) 🔒'));
    console.log(chalk.white('  2) Global (ALL servers) 🌐'));
    const scStr = (await ask(chalk.cyan('  Choice (1/2): '))).trim();
    const scope = scStr === '2' ? 'global' : 'here';

    const ok = permissions.addBlacklist(userId, scope, currentGuildId);
    if (ok) logger.success(`User ${userId} has been BLACKLISTED [${scope.toUpperCase()}].`);
    else logger.warn(`User ${userId} is already in the ${scope} blacklist.`);
  } else if (choice === '2') {
    const userId = (await ask(chalk.cyan('  User ID to remove: '))).trim();
    if (!userId) { logger.error('No ID provided.'); return; }
    const ok = permissions.removeBlacklist(userId, currentGuildId);
    if (ok) logger.success(`User ${userId} removed from blacklists.`);
    else logger.warn(`User ${userId} not found in blacklist.`);
  } else {
    logger.error('Invalid option.');
  }
}


// ─── Switch Token ─────────────────────────────────────────────────────────────
async function switchToken(currentClient) {
  logger.divider();
  console.log(chalk.yellow.bold('  SWITCH BOT TOKEN'));
  logger.divider();
  console.log(chalk.gray('  Naya token daalo to re-login karo, blank chhodo to cancel.'));
  console.log('');

  const token = await ask(chalk.yellow('  New bot token: '));
  const trimmed = token.trim();

  if (!trimmed) {
    logger.warn('Cancelled. Keeping current session.');
    return null;
  }

  if (trimmed.split('.').length < 3) {
    logger.error('That does not look like a valid bot token.');
    return null;
  }

  // Ask for new owner ID too
  console.log('');
  console.log(chalk.gray('  Apna Discord User ID daalo (naya owner) ya Enter dabao purana rakhne ke liye:'));
  const ownerInput = await ask(chalk.cyan('  Discord User ID: '));
  const trimmedOwner = ownerInput.trim();

  let newOwnerId = config.ownerId; // Default to current
  if (trimmedOwner) {
    if (/^\d{17,20}$/.test(trimmedOwner)) {
      newOwnerId = trimmedOwner;
    } else {
      logger.warn('Invalid User ID, keeping current owner ID.');
    }
  }

  const spinner = ora({ text: chalk.cyan('Disconnecting current session...'), color: 'cyan' }).start();
  try {
    currentClient.removeAllListeners();
    await currentClient.destroy();
    spinner.succeed(chalk.green('Disconnected'));
  } catch {
    spinner.warn(chalk.yellow('Could not cleanly disconnect'));
  }

  return { token: trimmed, ownerId: newOwnerId };
}


// ─── Create & Boot a Client ───────────────────────────────────────────────────
function createClient() {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildEmojisAndStickers,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
    // ── Performance & reliability tweaks ──────────────────────────────────
    rest: {
      timeout: 60_000,      // wait up to 60 s for slow Discord API responses
      retryLimit: 5,        // retry rate-limited / transient errors up to 5 times
    },
    makeCache: Options.cacheWithLimits({
      ...Options.DefaultMakeCacheSettings,
      MessageManager: 50,   // only keep last 50 messages per channel in RAM
      ReactionManager: 0,   // no reaction caching needed
      GuildStickerManager: 0,
      GuildScheduledEventManager: 0,
    }),
    sweepers: {
      ...Options.DefaultSweeperSettings,
      messages: { interval: 300, lifetime: 600 }, // sweep old messages every 5 min
      users: { interval: 300, filter: () => (u) => u.bot && u.id !== u.client.user.id },
    },
  });
}

async function loginClient(client, token) {
  const spinner = ora({ text: chalk.cyan('Connecting to Discord...'), color: 'cyan' }).start();
  const readyPromise = new Promise((resolve, reject) => {
    client.once('clientReady', resolve);
    client.once('error', reject);
    setTimeout(() => reject(new Error('Login timed out after 30s')), 30000);
  });
  await client.login(token);
  await readyPromise;
  spinner.succeed(chalk.green(`Logged in as ${chalk.white.bold(client.user.tag)}`));
}

// ─── Auto-reconnect on disconnect ─────────────────────────────────────────────
function attachReconnectHandler(client, token) {
  client.on('shardDisconnect', (event, id) => {
    logger.warn(`Shard ${id} disconnected (code ${event.code}). Reconnecting...`);
  });
  client.on('shardReconnecting', (id) => {
    logger.info(`Shard ${id} reconnecting...`);
  });
  client.on('shardResume', (id, replayed) => {
    logger.success(`Shard ${id} resumed (${replayed} events replayed)`);
  });
  client.on('shardError', (err, id) => {
    logger.error(`Shard ${id} error: ${err.message}`);
  });
}

// ─── Post-command pause ───────────────────────────────────────────────────────
async function afterCommand() {
  console.log('');
  const neonBlue = '#00f0ff';
  const neonPurple = '#bd00ff';
  console.log(gradientString('  ───────────────────────────────────────────────────────────────────', neonBlue, neonPurple));
  const ans = await ask(
    '  ' + chalk.gray('[Enter]') + chalk.white(' Back ') +
    chalk.gray('[0]') + chalk.red(' Exit ') +
    chalk.gray('[m]') + chalk.cyan(' Menu ') +
    chalk.magenta(' → ')
  );
  const val = ans.trim().toLowerCase();
  if (val === '0') {
    console.log(chalk.red('\n  [!] Shutting down HANGOUT HEAVEN...\n'));
    process.exit(0);
  }
  if (val === 'm') return 'menu';
  return 'continue';
}

// ─── Main Control Panel Loop ──────────────────────────────────────────────────
async function runControlPanel(client, guild) {
  loadCommands(commands);
  printMenu(client, guild);

  const prompt = () =>
    chalk.magentaBright('  hangout') +
    chalk.gray('@') +
    chalk.cyan(guild.name.replace(/\s/g, '-').toLowerCase()) +
    chalk.white(' > ');

  while (true) {
    const choice = await ask(prompt());
    console.log('');

    switch (choice.trim().toLowerCase()) {
      case '1': {
        const input = await ask(chalk.cyan('  createChannels ') + chalk.gray('<count> <name> (or "b" to back): '));
        if (input.trim().toLowerCase() === 'b' || input.trim().toLowerCase() === 'back') break;
        const [count, ...nameParts] = input.trim().split(/\s+/);
        await commands.get('createChannels').execute(guild, [count, nameParts.join('-') || 'channel']);
        const r1 = await afterCommand();
        if (r1 === 'menu') printMenu(client, guild);
        break;
      }
      case '2': {
        const input = await ask(chalk.cyan('  createRoles ') + chalk.gray('<count> <name> (or "b" to back): '));
        if (input.trim().toLowerCase() === 'b' || input.trim().toLowerCase() === 'back') break;
        const [count, ...nameParts] = input.trim().split(/\s+/);
        await commands.get('createRoles').execute(guild, [count, nameParts.join('-') || 'role']);
        const r2 = await afterCommand();
        if (r2 === 'menu') printMenu(client, guild);
        break;
      }
      case '3':
        await commands.get('serverInfo').execute(guild);
        { const r = await afterCommand(); if (r === 'menu') printMenu(client, guild); }
        break;
      case '4':
        await commands.get('memberTools').execute(guild);
        { const r = await afterCommand(); if (r === 'menu') printMenu(client, guild); }
        break;
      case '5': {
        await commands.get('sendMessage').execute(guild, ['pick'], ask);
        const r5 = await afterCommand();
        if (r5 === 'menu') printMenu(client, guild);
        break;
      }
      case '6':
        showAccessList();
        { const r = await afterCommand(); if (r === 'menu') printMenu(client, guild); }
        break;
      case '7':
        showWhitelist();
        { const r = await afterCommand(); if (r === 'menu') printMenu(client, guild); }
        break;
      case 'a': {
        await manageAccessWhitelist(guild.id);
        const r = await afterCommand(); if (r === 'menu') printMenu(client, guild);
        break;
      }
      case 'bl': {
        await manageBlacklist(guild.id);
        const rbl = await afterCommand(); if (rbl === 'menu') printMenu(client, guild);
        break;
      }
      case '8':
        loadCommands(commands);
        logger.success('Commands reloaded');
        { const r = await afterCommand(); if (r === 'menu') printMenu(client, guild); }
        break;
      case '9':
        await commands.get('systemStats').execute(client);
        { const r = await afterCommand(); if (r === 'menu') printMenu(client, guild); }
        break;
      case 'd1': {
        const t1 = await ask(chalk.cyan('  Target channel name (leave blank for ALL, "b" to back): '));
        if (t1.trim().toLowerCase() === 'b' || t1.trim().toLowerCase() === 'back') break;
        const targetDesc1 = t1.trim() ? `channels named "${t1.trim()}"` : 'ALL channels';

        logger.warn(`This will delete ${targetDesc1}. Type "yes" to confirm: `);
        const c1 = await ask(chalk.red('  Confirm (yes): '));
        if (c1.trim().toLowerCase() === 'yes') {
          await commands.get('deleteChannels').execute(guild, t1.trim() ? [t1.trim()] : []);
        } else { logger.warn('Cancelled.'); }
        const rd1 = await afterCommand();
        if (rd1 === 'menu') printMenu(client, guild);
        break;
      }
      case 'd2': {
        const t2 = await ask(chalk.cyan('  Target role name (leave blank for ALL, "b" to back): '));
        if (t2.trim().toLowerCase() === 'b' || t2.trim().toLowerCase() === 'back') break;
        const targetDesc2 = t2.trim() ? `roles named "${t2.trim()}"` : 'ALL roles';

        logger.warn(`This will delete ${targetDesc2}. Type "yes" to confirm: `);
        const c2 = await ask(chalk.red('  Confirm (yes): '));
        if (c2.trim().toLowerCase() === 'yes') {
          await commands.get('deleteRoles').execute(guild, t2.trim() ? [t2.trim()] : []);
        } else { logger.warn('Cancelled.'); }
        const rd2 = await afterCommand();
        if (rd2 === 'menu') printMenu(client, guild);
        break;
      }
      case 'd3': {
        logger.warn('NUKE: Delete ALL channels + ALL roles. Type "nuke" to confirm: ');
        const c3 = await ask(chalk.red('  Confirm (nuke): '));
        if (c3.trim().toLowerCase() === 'nuke') {
          await commands.get('deleteAll').execute(guild);
        } else { logger.warn('Cancelled.'); }
        const rd3 = await afterCommand();
        if (rd3 === 'menu') printMenu(client, guild);
        break;
      }
      case 'mb': {
        const countStr = await ask(chalk.cyan('  How many members to ban? (type "all" or a number, or "b" to back): '));
        if (countStr.trim().toLowerCase() === 'b' || countStr.trim().toLowerCase() === 'back') {
          printMenu(client, guild);
          break;
        }

        let limit = Infinity;
        if (countStr.trim().toLowerCase() !== 'all') {
          limit = parseInt(countStr.trim(), 10);
          if (isNaN(limit) || limit <= 0) {
            logger.error('Invalid number.');
            const rmb_err = await afterCommand();
            if (rmb_err === 'menu') printMenu(client, guild);
            break;
          }
        }

        logger.warn(`This will BAN ${limit === Infinity ? 'ALL' : limit} USERS. Type "yes" to confirm: `);
        const cmb = await ask(chalk.red('  Confirm (yes): '));
        if (cmb.trim().toLowerCase() === 'yes') {
          await commands.get('massBan').execute(guild, limit);
        } else { logger.warn('Cancelled.'); }
        const rmb = await afterCommand();
        if (rmb === 'menu') printMenu(client, guild);
        break;
      }
      case 'sp': {
        const textChannels = [...guild.channels.cache.filter(c => c.isTextBased()).values()];
        logger.divider();
        console.log(chalk.magenta.bold('  SELECT CHANNEL TO SPAM'));
        logger.divider();
        textChannels.forEach((c, i) => {
          console.log(`  ${chalk.green(`[${i + 1}]`)} ${chalk.white('#' + c.name)} ${chalk.gray(`— ${c.id}`)}`);
        });
        logger.divider();

        let spIdx, spCount, spMsg;
        let step = 1;
        while (step >= 1 && step <= 3) {
          if (step === 1) {
            const spPick = await ask(chalk.cyan('  Channel number (or "b" to back): '));
            if (spPick.trim().toLowerCase() === 'b' || spPick.trim().toLowerCase() === 'back') { step--; continue; }
            spIdx = parseInt(spPick.trim()) - 1;
            if (isNaN(spIdx) || spIdx < 0 || spIdx >= textChannels.length) {
              logger.error('Invalid selection.');
              continue;
            }
            step = 2;
          } else if (step === 2) {
            spCount = await ask(chalk.cyan('  How many times (or "b" to back): '));
            if (spCount.trim().toLowerCase() === 'b' || spCount.trim().toLowerCase() === 'back') { step--; continue; }
            step = 3;
          } else if (step === 3) {
            spMsg = await ask(chalk.cyan('  Message (or "b" to back): '));
            if (spMsg.trim().toLowerCase() === 'b' || spMsg.trim().toLowerCase() === 'back') { step--; continue; }
            step = 4;
          }
        }
        if (step < 1) break; // Exited directly to root menu

        const spChannel = textChannels[spIdx];
        await commands.get('spamChannel').execute(guild, [spChannel.id, spCount.trim(), ...spMsg.trim().split(' ')]);
        const rsp = await afterCommand();
        if (rsp === 'menu') printMenu(client, guild);
        break;
      }
      case 'sa': {
        let saCount, saMsg;
        let step = 1;
        while (step >= 1 && step <= 2) {
          if (step === 1) {
            saCount = await ask(chalk.cyan('  Messages per channel (or "b" to back): '));
            if (saCount.trim().toLowerCase() === 'b' || saCount.trim().toLowerCase() === 'back') { step--; continue; }
            step = 2;
          } else if (step === 2) {
            saMsg = await ask(chalk.cyan('  Message (or "b" to back): '));
            if (saMsg.trim().toLowerCase() === 'b' || saMsg.trim().toLowerCase() === 'back') { step--; continue; }
            step = 3;
          }
        }
        if (step < 1) break; // Exited to root menu

        await commands.get('spamAll').execute(guild, [saCount.trim(), ...saMsg.trim().split(' ')]);
        const rsa = await afterCommand();
        if (rsa === 'menu') printMenu(client, guild);
        break;
      }
      case 'cs': {
        const targetText = await ask(chalk.cyan('  Text to delete (e.g., @everyone) (or "b" to back): '));
        if (targetText.trim().toLowerCase() === 'b' || targetText.trim().toLowerCase() === 'back' || !targetText.trim()) {
          logger.warn('Cancelled.');
          break;
        }
        await commands.get('cleanSpam').execute(guild, targetText.trim().split(' '));
        const rcs = await afterCommand();
        if (rcs === 'menu') printMenu(client, guild);
        break;
      }
      case 'bp': {
        await commands.get('botProfile').execute(guild, [], null, ask, client);
        const rbp = await afterCommand();
        if (rbp === 'menu') printMenu(client, guild);
        break;
      }
      case 'es': {
        await commands.get('emojisync').execute(guild, [], null, null, client);
        const res = await afterCommand(); if (res === 'menu') printMenu(client, guild);
        break;
      }
      case 'st': {
        console.log('');
        console.log(chalk.blue('  [Steal Emoji]'));
        const rawE = await ask(chalk.white('  Emoji (Mention or ID) daalein: '));
        const newE = await ask(chalk.white('  Naya naam (Optional, enter to skip): '));
        if (rawE.trim()) {
          const argsSt = [rawE.trim()];
          if (newE.trim()) argsSt.push(newE.trim());
          await commands.get('steal').execute(guild, argsSt, { guild, member: guild.members.me, channel: { send: (m) => console.log(m.embeds?.[0]?.description || m) } });
        }
        const rst = await afterCommand(); if (rst === 'menu') printMenu(client, guild);
        break;
      }
      case 'bos': {
        console.log('');
        console.log(chalk.cyan('  [Bot Owner Status]'));
        const oName = client.ownerName || config.ownerId || 'Not Set';
        console.log(chalk.white('  Current Bot Owner: ') + chalk.green.bold(oName));
        const rbos = await afterCommand();
        if (rbos === 'menu') printMenu(client, guild);
        break;
      }
      case 'bs': {
        await commands.get('botStatus').execute(guild, [], null, ask, client);
        const rbs = await afterCommand();
        if (rbs === 'menu') printMenu(client, guild);
        break;
      }
      case 's': {
        const newGuild = await selectServer(client);
        if (newGuild) {
          guild = newGuild;
          printMenu(client, guild);
        }
        break;
      }
      case 't': {
        const switchResult = await switchToken(client);
        if (switchResult) {
          return { action: 'switchToken', token: switchResult.token, ownerId: switchResult.ownerId };
        }
        break;
      }
      case '0':
        console.log(chalk.red('\n  [!] Shutting down HANGOUT HEAVEN...\n'));
        client.destroy();
        process.exit(0);
        break;
      default:
        logger.warn(`Unknown option: "${choice}". Enter a number or letter from the menu.`);
    }
  }
}

// ─── Boot Loop ────────────────────────────────────────────────────────────────
async function boot(token) {
  await runBootAnimation();
  await printBanner();

  const client = createClient();

  client.on('error', (err) => logger.error(`Discord error: ${err.message}`));
  client.on('warn', (msg) => logger.warn(msg));

  attachReconnectHandler(client, token);

  // Discord message prefix handler
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Mention responder
    if (message.content.trim() === `<@${client.user.id}>` || message.content.trim() === `<@!${client.user.id}>`) {
      const gPrefix = message.guild ? prefixManager.getPrefix(message.guild.id) : config.prefix;
      const mentionEmbed = new EmbedBuilder()
        .setColor('#00f0ff')
        .setDescription(`Hello! 👋\n\n💬 My prefix in this server is: \`${gPrefix}\`\nℹ️ Use \`${gPrefix}help\` to see my available commands!`);
      return message.channel.send({ embeds: [mentionEmbed] }).catch(() => { });
    }

    let args;
    let cmdName;
    const currentPrefix = message.guild ? prefixManager.getPrefix(message.guild.id) : config.prefix;
    const hasPrefix = message.content.startsWith(currentPrefix);
    const isNoPrefixUser = noprefix.hasNoPrefix(message.author.id);

    if (hasPrefix) {
      args = message.content.slice(currentPrefix.length).trim().split(/\s+/);
      cmdName = (args.shift() || '').toLowerCase();
    } else if (isNoPrefixUser) {
      args = message.content.trim().split(/\s+/);
      cmdName = (args.shift() || '').toLowerCase();
      if (!cmdName) return;
    } else {
      return;
    }

    // Ignore commands if bot is 'stopped', except the command to wake it up
    if (client.isStopped && cmdName !== 'botcontrol' && cmdName !== 'bc') {
      return;
    }

    if (permissions.isBlacklisted(message.author.id, message.guild?.id)) {
      return;
    }

    if (!permissions.isAuthorized(message) && !isNoPrefixUser) {
      message.channel?.send('❌ You are not authorized to use bot commands.').catch(() => { });
      return;
    }

    if (cmdName === 'help' || cmdName === 'h') {
      const helpLines = [resolveEmojis(client, '{INFO} **Available commands:**')];
      const hiddenCommands = ['systemStats', 'serverInfo', 'memberTools'];
      const uniqueCommands = new Set(commands.values());

      for (const cmd of uniqueCommands) {
        if (hiddenCommands.includes(cmd.name) || cmd.hidden) continue;
        if (cmd.ownerOnly && message.author.id !== config.ownerId) continue;
        const aliasStr = cmd.aliases ? ` *(Aliases: ${cmd.aliases.join(', ')})*` : '';
        const emoji = cmd.name.toLowerCase().includes('delete') ? '{DELETE}' :
          cmd.name.toLowerCase().includes('spam') ? '{SPAM}' :
            cmd.name.toLowerCase().includes('ban') ? '{BAN}' :
              cmd.name.toLowerCase().includes('access') || cmd.name.toLowerCase().includes('whitelist') ? '{KEY}' : '•';

        helpLines.push(`${resolveEmojis(client, emoji)} **${currentPrefix}${cmd.name}**${aliasStr} — ${cmd.description || 'No description'} `);
      }
      helpLines.push(resolveEmojis(client, `\n{PING} **Bot Ping:** ${client.ws.ping === -1 ? 'Calculating...' : client.ws.ping + 'ms'}`));

      const helpEmbed = new EmbedBuilder()
        .setColor('#bd00ff')
        .setDescription(helpLines.join('\n'))
        .setFooter({ text: resolveEmojis(client, '{LS_OWNER} Developed by Zabro.dev') });

      if (message.guild) {
        const icon = message.guild.iconURL({ extension: 'png', size: 1024 }) || undefined;
        helpEmbed.setAuthor({ name: message.guild.name, iconURL: icon });
      }

      message.channel?.send({ embeds: [helpEmbed] }).catch(() => { });
      return;
    }

    const cmd = commands.get(cmdName);
    if (!cmd || !message.guild) {
      return;
    }

    try {
      const skipWrappers = [
        'ping', 'p', 'purge', 'pu', 'pr', 'clear', 'access', 'whitelist', 'wl', 'ac', 'purgebot', 'pb', 'noprefix', 'np',
        'deletechannels', 'dc', 'deleteroles', 'dr', 'deleteall', 'da', 'botprofile', 'bp', 'prefix', 'setprefix',
        'botcontrol', 'bc', 'bos', 'blacklist', 'bl', 'createchannels', 'cc', 'spamall', 'sa',
        'createroles', 'rc', 'cr', 'membertools', 'mt', 'sendmessage', 'sm', 'msg', 'serverinfo', 'si', 'sv',
        'spamchannel', 'sc', 'systemstats', 'ss', 'cleanspam', 'cs', 'massban', 'mb', 'nuke', 'botstatus', 'bs', 'status'
      ];

      let startMsg = null;
      if (!skipWrappers.includes(cmdName)) {
        const startEmbed = new EmbedBuilder()
          .setColor('#00f0ff')
          .setDescription(resolveEmojis(client, '{START} **Execution Started**'));
        if (message.channel) {
          startMsg = await message.channel.send({ embeds: [startEmbed] }).catch(() => null);
        }
      }

      if (cmd.name === 'systemStats') await cmd.execute(client);
      else await cmd.execute(message.guild, args, message, ask, client);

      if (!skipWrappers.includes(cmdName) && startMsg) {
        const completeEmbed = new EmbedBuilder()
          .setColor('#00ff00')
          .setDescription(resolveEmojis(client, '{SUCCESS} **Execution Complete**'));
        startMsg.edit({ embeds: [completeEmbed] }).catch(() => { });
      }
    } catch (err) {
      logger.error(`Command error (${cmdName}): ${err.message}`);
      const errEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setDescription(`❌ **Error running command:** ${err.message}`);
      message.channel?.send({ embeds: [errEmbed] }).catch(() => { });
    }
  });

  try {
    await loginClient(client, token);
  } catch (err) {
    console.log(chalk.red(`\n  [✗] Login failed: ${err.message}`));
    console.log(chalk.gray('  Check the token and try again.\n'));

    const retry = await ask(chalk.yellow('  Enter a different token, or press Enter to exit: '));
    const trimmed = retry.trim();
    if (!trimmed) process.exit(1);
    tokenStore.saveToken(trimmed, config.ownerId);
    config.token = trimmed;
    process.env.BOT_TOKEN = trimmed;
    logger.success('Token saved — will auto-load next time.');
    return boot(trimmed);
  }

  // Ensure message command modules are loaded before handling messages
  loadCommands(commands);

  // Fetch owner tag
  let ownerDisplay = config.ownerId || 'Not Set';
  if (config.ownerId) {
    try {
      const ownerUser = await client.users.fetch(config.ownerId);
      if (ownerUser) {
        ownerDisplay = ownerUser.tag;
        client.ownerName = ownerDisplay;
      }
    } catch {
      // Ignore if fetch fails
    }
  }

  logger.info(`Ping: ${chalk.yellow(client.ws.ping === -1 ? 'Calculating...' : client.ws.ping + 'ms')}`);
  logger.info(`Owner: ${chalk.green(ownerDisplay)}`);
  logger.info(`Guilds: ${chalk.yellow(client.guilds.cache.size)}`);
  console.log('');

  const guild = await selectServer(client);
  if (!guild) {
    const newToken = await ask(chalk.yellow('  Enter new bot token: '));
    if (newToken.trim()) {
      tokenStore.saveToken(newToken.trim(), config.ownerId);
      config.token = newToken.trim();
      process.env.BOT_TOKEN = newToken.trim();
      logger.success('Token saved — will auto-load next time.');
      client.removeAllListeners();
      await client.destroy();
      return boot(newToken.trim());
    }
    process.exit(0);
  }

  const result = await runControlPanel(client, guild);

  if (result?.action === 'switchToken') {
    tokenStore.saveToken(result.token, result.ownerId);
    config.token = result.token;
    process.env.BOT_TOKEN = result.token;
    if (result.ownerId) {
      config.ownerId = result.ownerId;
      process.env.OWNER_ID = result.ownerId;
    }
    logger.success('Token aur Owner ID saved — will auto-load next time.');
    return boot(result.token);
  }
}

// ─── Entry Point ──────────────────────────────────────────────────────────────
(async () => {
  console.clear();
  console.log(chalk.cyan.bold('\n  [SECURITY CHECK]'));
  const accessKey = await ask(chalk.yellow('  Enter Access Key to start HANGOUT HEAVEN: '));

  if (accessKey.trim() !== '99880077') {
    console.log(chalk.red('\n  [!] Invalid Access Key. Access Denied.\n'));
    process.exit(1);
  }

  console.log(chalk.green('  Access Granted.\n'));
  await sleep(800);

  // First-run setup sirf .exe (pkg) mein hoga, node index.js mein nahi
  const isPkg = typeof process.pkg !== 'undefined';
  const isFirst = isPkg && tokenStore.isFirstRun();

  if (isFirst) {
    // ── First-time setup (only in .exe) ──────────────────────────────────────
    await runBootAnimation();
    await printBanner();

    console.log(chalk.yellow.bold('  ╔══════════════════════════════════════════╗'));
    console.log(chalk.yellow.bold('  ║         FIRST TIME SETUP                ║'));
    console.log(chalk.yellow.bold('  ╚══════════════════════════════════════════╝'));
    console.log('');
    console.log(chalk.gray('  Yeh setup sirf ek baar hoga. Agle baar auto-login hoga.'));
    console.log('');

    // Step 1: Bot Token
    const token = await ask(chalk.cyan('  [1/2] Bot Token daalo: '));
    const trimmedToken = token.trim();
    if (!trimmedToken) { logger.error('Token nahi diya. Exiting.'); process.exit(1); }
    if (trimmedToken.split('.').length < 3) { logger.error('Invalid token format.'); process.exit(1); }

    // Step 2: Discord Owner ID
    console.log('');
    console.log(chalk.gray('  Apna Discord User ID daalo — tum bot ke owner banoge.'));
    console.log(chalk.gray('  (Discord > Settings > Advanced > Developer Mode ON > Apne naam pe right-click > Copy ID)'));
    console.log('');
    const ownerIdInput = await ask(chalk.cyan('  [2/2] Apna Discord User ID daalo: '));
    const trimmedOwnerId = ownerIdInput.trim();
    if (!trimmedOwnerId || !/^\d{17,20}$/.test(trimmedOwnerId)) {
      logger.error('Invalid Discord User ID. 17-20 digit number hona chahiye.');
      process.exit(1);
    }

    tokenStore.saveToken(trimmedToken, trimmedOwnerId);
    console.log('');
    logger.success('Setup complete! Token aur Owner ID save ho gaya.');
    logger.success(`Owner ID: ${chalk.white(trimmedOwnerId)}`);
    console.log('');
    await sleep(1000);

    // Reload config so ownerId is live
    config.token = trimmedToken;
    config.ownerId = trimmedOwnerId;
    process.env.BOT_TOKEN = trimmedToken;
    process.env.OWNER_ID = trimmedOwnerId;

    await boot(trimmedToken);
  } else {
    // Normal flow — node index.js ya already-setup exe
    if (!config.token) {
      logger.error('No token found. .env mein BOT_TOKEN set karo.');
      process.exit(1);
    }
    await boot(config.token);
  }
})();

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  res.end("Bot is alive!");
});

server.listen(config.port, () => {
  console.log(`HTTP server running on port ${config.port}`);
});

