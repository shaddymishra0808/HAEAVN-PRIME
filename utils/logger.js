const chalk = require('chalk');

const timestamp = () => {
  const now = new Date();
  return chalk.gray(`[${now.toTimeString().slice(0, 8)}]`);
};

const logger = {
  success: (msg) => console.log(`${timestamp()} ${chalk.green('✔')} ${chalk.white(msg)}`),
  error: (msg) => console.log(`${timestamp()} ${chalk.red('✘')} ${chalk.red(msg)}`),
  info: (msg) => console.log(`${timestamp()} ${chalk.cyan('ℹ')} ${chalk.cyan(msg)}`),
  warn: (msg) => console.log(`${timestamp()} ${chalk.yellow('⚠')} ${chalk.yellow(msg)}`),
  progress: (current, total, label = '') => {
    const pct = Math.floor((current / total) * 100);
    const bar = chalk.green('█').repeat(Math.floor(pct / 5)) + chalk.gray('░').repeat(20 - Math.floor(pct / 5));
    process.stdout.write(`\r  ${chalk.cyan('Progress:')} [${bar}] ${chalk.yellow(`${current}/${total}`)} ${label}   `);
    if (current === total) process.stdout.write('\n');
  },
  divider: () => console.log(chalk.gray('  ' + '─'.repeat(67))),
  blank: () => console.log(''),
};

module.exports = logger;
