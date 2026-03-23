const logger = require('../utils/logger');

const { EmbedBuilder } = require('discord.js');

function reply(message, text, color = '#00f0ff') {
  if (message && message.channel && typeof message.channel.send === 'function') {
    const embed = new EmbedBuilder().setColor(color).setDescription(text);
    return message.channel.send({ embeds: [embed] }).catch(() => { });
  }
}

module.exports = {
  name: 'createRoles',
  description: 'Create multiple roles with a base name',
  async execute(guild, args, message = null) {
    const count = parseInt(args[0]);
    const baseName = args.slice(1).join('-') || 'role';

    if (isNaN(count) || count < 1 || count > 250) {
      if (message) {
        const config = require('../config');
        const embed = new EmbedBuilder()
          .setColor('#00f0ff')
          .setTitle('🎭 Create Roles')
          .setDescription('Creates multiple roles in the server.')
          .addFields(
            { name: '📖 Usage', value: `\`${config.prefix}rc <count> <name>\``, inline: true },
            { name: '📝 Example', value: `\`${config.prefix}rc 20 member\``, inline: true }
          )
          .setFooter({ text: 'Count must be between 1 and 250.' });
        return message.channel.send({ embeds: [embed] }).catch(() => { });
      }
      logger.error('Usage: createRoles <count> <name> (count must be 1–250)');
      return;
    }

    logger.info(`Creating ${count} roles with base name "${baseName}"...`);
    logger.divider();

    let success = 0;
    let failed = 0;

    const tasks = [];
    for (let i = 0; i < count; i++) {
      // Create role without waiting inside the loop (parallel firing)
      const p = guild.roles.create({ name: baseName })
        .then(() => {
          success++;
          logger.success(`Role created: ${baseName}`);
          logger.progress(success + failed, count);
        })
        .catch(() => {
          failed++;
          logger.error(`Failed to create: ${baseName}`);
          logger.progress(success + failed, count);
        });

      tasks.push(p);

      // roles stagger (40ms * 20 = 800ms per batch)
      await new Promise(r => setTimeout(r, 40));

      // After every 20 roles, take a break to avoid the strict role rate limit
      if ((i + 1) % 20 === 0 && (i + 1) < count) {
        logger.info('Applying tactical delay after a batch of 20 roles...');
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Wait for all creation tasks to finish before showing the summary
    await Promise.allSettled(tasks);

    logger.divider();
    if (failed === 0) {
      console.log(`\n${require('chalk').green(`SUCCESS: ${success}/${count} roles created`)}`);
    } else {
      console.log(`\n${require('chalk').yellow(`DONE: ${success} created, ${failed} failed`)}`);
    }
  },
};
