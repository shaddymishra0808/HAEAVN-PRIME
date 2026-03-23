const chalk = require('chalk');
const ora = require('ora');
const logger = require('../utils/logger');

module.exports = {
  name: 'memberTools',
  description: 'Fetch and display member list',
  async execute(guild) {
    const spinner = ora({ text: chalk.cyan('Fetching members...'), color: 'cyan' }).start();

    try {
      const members = await guild.members.fetch();
      spinner.succeed(chalk.green(`Fetched ${members.size} members`));

      logger.divider();
      console.log(chalk.cyan.bold(`  MEMBER LIST (${members.size} total)`));
      logger.divider();

      let i = 0;
      for (const [id, member] of members) {
        i++;
        const status = member.presence?.status || 'offline';
        const statusColor = { online: 'green', idle: 'yellow', dnd: 'red', offline: 'gray' }[status] || 'gray';
        const bot = member.user.bot ? chalk.magenta(' [BOT]') : '';
        console.log(
          `  ${chalk.gray(`${String(i).padStart(3, '0')})`)} ${chalk[statusColor]('●')} ${chalk.white(member.user.tag)}${bot} ${chalk.gray(`(${id})`)}`
        );
        if (i >= 50 && members.size > 50) {
          console.log(chalk.gray(`  ... and ${members.size - 50} more`));
          break;
        }
      }
      logger.divider();
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${err.message}`));
    }
  },
};
