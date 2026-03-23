const logger = require('./../utils/logger');
const { EmbedBuilder } = require('discord.js');
const { resolveEmojis } = require('./../utils/emojis');

function reply(bot, message, text, color = '#00f0ff') {
  if (message && message.channel && typeof message.channel.send === 'function') {
    const embed = new EmbedBuilder().setColor(color).setDescription(resolveEmojis(bot, text));
    return message.channel.send({ embeds: [embed] }).catch(() => { });
  }
}

module.exports = {
  name: 'createChannels',
  description: 'Create multiple channels with a base name',
  async execute(guild, args, message = null, _ask, client) {
    const bot = client || message?.client;
    const count = parseInt(args[0]);
    const baseName = args.slice(1).join('-') || 'channel';

    if (isNaN(count) || count < 1 || count > 500) {
      if (message) {
        const config = require('./../config');
        const embed = new EmbedBuilder()
          .setColor('#00f0ff')
          .setTitle(resolveEmojis(bot, '{CREATE} Create Channels'))
          .setDescription(resolveEmojis(bot, 'Creates multiple channels in the server.'))
          .addFields(
            { name: resolveEmojis(bot, '{INFO} Usage'), value: `\`${config.prefix}cc <count> <name>\``, inline: true },
            { name: resolveEmojis(bot, '📝 Example'), value: `\`${config.prefix}cc 50 raid-zone\``, inline: true }
          )
          .setFooter({ text: 'Count must be between 1 and 500.' });
        return message.channel.send({ embeds: [embed] }).catch(() => { });
      }
      logger.error('Usage: createChannels <count> <name> (count must be 1–500)');
      return;
    }

    logger.info(`Creating ${count} channels with base name "${baseName}"...`);
    logger.divider();

    let success = 0;
    let failed = 0;

    const BATCH = 60;
    for (let i = 0; i < count; i += BATCH) {
      const batch = [];
      for (let j = i; j < Math.min(i + BATCH, count); j++) {
        batch.push(
          guild.channels.create({ name: baseName, type: 0 })
            .then(() => {
              success++;
              // logger.success(`Channel created: ${baseName}`);
              logger.progress(success + failed, count);
            })
            .catch(() => {
              failed++;
              // logger.error(`Failed to create: ${baseName}`);
              logger.progress(success + failed, count);
            })
        );
      }
      await Promise.all(batch);
      if (i + BATCH < count) await new Promise(r => setTimeout(r, 200));
    }

    logger.divider();
    if (message) {
      if (failed === 0) {
        reply(bot, message, `{SUCCESS} Successfully created **${success}** channels.`, '#00ff00');
      } else {
        reply(bot, message, `{INFO} Finished: **${success}** created, **${failed}** failed.`, '#ffff00');
      }
    }
  },
};
