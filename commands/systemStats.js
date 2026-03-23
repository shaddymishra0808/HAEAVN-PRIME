const chalk = require('chalk');
const os = require('os');
const logger = require('../utils/logger');

module.exports = {
  name: 'systemStats',
  description: 'Display system and bot statistics',
  async execute(client) {
    const mem = process.memoryUsage();
    const uptime = process.uptime();
    const cpus = os.cpus();

    const formatUptime = (s) => {
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = Math.floor(s % 60);
      return `${d}d ${h}h ${m}m ${sec}s`;
    };

    const toMB = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';

    logger.divider();
    console.log(chalk.cyan.bold('  SYSTEM STATISTICS'));
    logger.divider();
    console.log(`  ${chalk.gray('Bot Tag      :')} ${chalk.white(client.user.tag)}`);
    console.log(`  ${chalk.gray('Bot ID       :')} ${chalk.yellow(client.user.id)}`);
    console.log(`  ${chalk.gray('Servers      :')} ${chalk.green(client.guilds.cache.size)}`);
    console.log(`  ${chalk.gray('Bot Ping     :')} ${chalk.yellow(client.ws.ping === -1 ? 'Calculating...' : client.ws.ping + 'ms')}`);
    console.log(`  ${chalk.gray('Bot Uptime   :')} ${chalk.green(formatUptime(uptime))}`);
    logger.divider();
    console.log(`  ${chalk.gray('Heap Used    :')} ${chalk.yellow(toMB(mem.heapUsed))}`);
    console.log(`  ${chalk.gray('Heap Total   :')} ${chalk.yellow(toMB(mem.heapTotal))}`);
    console.log(`  ${chalk.gray('RSS          :')} ${chalk.yellow(toMB(mem.rss))}`);
    logger.divider();
    console.log(`  ${chalk.gray('CPU Model    :')} ${chalk.white(cpus[0]?.model || 'N/A')}`);
    console.log(`  ${chalk.gray('CPU Cores    :')} ${chalk.white(cpus.length)}`);
    console.log(`  ${chalk.gray('OS Platform  :')} ${chalk.white(os.platform())} / ${chalk.white(os.arch())}`);
    console.log(`  ${chalk.gray('Node.js      :')} ${chalk.white(process.version)}`);
    logger.divider();
  },
};
