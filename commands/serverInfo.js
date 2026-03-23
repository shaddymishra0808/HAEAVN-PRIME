const chalk = require('chalk');
const logger = require('../utils/logger');

module.exports = {
  name: 'serverInfo',
  description: 'Display server information',
  async execute(guild) {
    logger.divider();
    console.log(chalk.cyan.bold('  SERVER INFORMATION'));
    logger.divider();
    console.log(`  ${chalk.gray('Name     :')} ${chalk.white(guild.name)}`);
    console.log(`  ${chalk.gray('ID       :')} ${chalk.yellow(guild.id)}`);
    console.log(`  ${chalk.gray('Owner    :')} ${chalk.white(guild.ownerId)}`);
    console.log(`  ${chalk.gray('Members  :')} ${chalk.green(guild.memberCount)}`);
    console.log(`  ${chalk.gray('Channels :')} ${chalk.green(guild.channels.cache.size)}`);
    console.log(`  ${chalk.gray('Roles    :')} ${chalk.green(guild.roles.cache.size)}`);
    console.log(`  ${chalk.gray('Boosts   :')} ${chalk.magenta(guild.premiumSubscriptionCount || 0)}`);
    console.log(`  ${chalk.gray('Created  :')} ${chalk.white(guild.createdAt.toDateString())}`);
    logger.divider();
  },
};
