const chalk = require('chalk');

// Explicit static requires so pkg can bundle all commands into the .exe
const COMMANDS = [
  require('../commands/createChannels'),
  require('../commands/createRoles'),
  require('../commands/deleteAll'),
  require('../commands/deleteChannels'),
  require('../commands/deleteRoles'),
  require('../commands/memberTools'),
  require('../commands/sendMessage'),
  require('../commands/serverInfo'),
  require('../commands/spamAll'),
  require('../commands/spamChannel'),
  require('../commands/systemStats'),
  require('../commands/access'),
  require('../commands/whitelist'),
  require('../commands/cleanSpam'),
  require('../commands/ping'),
  require('../commands/massBan'),
  require('../commands/purge'),
  require('../commands/purgeBot'),
  require('../commands/noprefix'),
  require('../commands/botProfile'),
  require('../commands/prefix'),
  require('../commands/botControl'),
  require('../commands/bos'),
  require('../commands/blacklist'),
  require('../commands/emojisync'),
  require('../commands/steal'),
  require('../commands/botStatus'),
];

const ALIASES = {
  createChannels: ['cc'],
  createRoles: ['rc', 'cr'],
  deleteAll: ['da', 'nuke'],
  deleteChannels: ['dc'],
  deleteRoles: ['dr'],
  memberTools: ['mt'],
  sendMessage: ['sm', 'msg'],
  serverInfo: ['si', 'sv'],
  spamAll: ['sa'],
  spamChannel: ['sc'],
  systemStats: ['ss'],
  access: ['ac'],
  whitelist: ['wl'],
  cleanSpam: ['cs'],
  ping: ['p'],
  massBan: ['mb'],
  purge: ['pu', 'pr', 'clear'],
  purgeBot: ['pb'],
  noprefix: ['np'],
  botProfile: ['bp'],
  prefix: ['setprefix'],
  botcontrol: ['bc'],
  bos: [],
  blacklist: ['bl'],
  emojisync: ['es'],
  steal: ['addemoji', 'stealemoji'],
  botStatus: ['bs', 'status'],
};

const loadCommands = (commandsMap) => {
  commandsMap.clear();
  let uniqueCount = 0;
  for (const cmd of COMMANDS) {
    const name = cmd.name || '';
    if (!name) continue;
    uniqueCount++;
    commandsMap.set(name, cmd);
    commandsMap.set(name.toLowerCase(), cmd);

    if (ALIASES[name]) {
      cmd.aliases = ALIASES[name]; // Bind alias to the command object for help msg
      for (const alias of ALIASES[name]) {
        commandsMap.set(alias.toLowerCase(), cmd);
      }
    }
  }
  console.log(chalk.green(`[✓] Loaded ${uniqueCount} unique commands (${commandsMap.size} with aliases)`));
  return commandsMap;
};

module.exports = { loadCommands };
