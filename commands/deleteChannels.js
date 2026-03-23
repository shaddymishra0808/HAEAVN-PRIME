const { EmbedBuilder } = require('discord.js');
const chalk = require('chalk');
const logger = require('../utils/logger');
const permissions = require('../utils/permissions');
const { resolveEmojis } = require('../utils/emojis');

module.exports = {
  name: 'deleteChannels',
  description: 'Delete all channels in the server',
  async execute(guild, args = [], message = null, _ask, client) {
    const targetName = args.join(' ').toLowerCase();
    const config = require('../config');
    const bot = client || message?.client;

    if (targetName === 'help' || targetName === 'usage') {
      const embed = new EmbedBuilder()
        .setColor('#ffaa00')
        .setTitle(resolveEmojis(bot, '{DELETE} Delete Channels'))
        .setDescription(resolveEmojis(bot, 'Deletes channels from the server.'))
        .addFields(
          { name: resolveEmojis(bot, '{CLEAN} Delete All'), value: `\`${config.prefix}dc\``, inline: true },
          { name: resolveEmojis(bot, '{TARGET} Delete Specific'), value: `\`${config.prefix}dc <channel-name>\``, inline: true }
        )
        .setFooter({ text: 'Warning: This action cannot be undone!' });
      return message.channel.send({ embeds: [embed] }).catch(() => { });
    }

    const channels = guild.channels.cache.filter(c => {
      if (!c.deletable || permissions.isWhitelisted(c.id)) return false;
      if (targetName && c.name.toLowerCase() !== targetName) return false;
      return true;
    });

    if (channels.size === 0) {
      if (message) message.channel.send(resolveEmojis(bot, `{ERROR} No deletable channels found${targetName ? ` named "${targetName}"` : ''}.`)).catch(() => { });
      logger.warn(targetName ? `No deletable channels found named "${targetName}".` : 'No deletable channels found.');
      return;
    }

    if (message) {
      const confirmEmbed = new EmbedBuilder()
        .setColor('#ffaa00')
        .setDescription(resolveEmojis(bot, `{WARN} **WARNING:** You are about to delete **${channels.size}** ${targetName ? `channels named "${targetName}"` : 'channels'}.\n\nAre you sure? Type \`yes\` to confirm or \`no\` to cancel. (15s timeout)`));

      await message.channel.send({ embeds: [confirmEmbed] });

      const filter = m => m.author.id === message.author.id;
      try {
        const collected = await message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });
        const response = collected.first().content.toLowerCase();
        if (response !== 'yes' && response !== 'y') {
          message.channel.send(resolveEmojis(bot, '{ERROR} **Cancelled deletion.**')).catch(() => { });
          return;
        }
      } catch (e) {
        message.channel.send(resolveEmojis(bot, '{LOADING} **Confirmation timed out. Cancelled.**')).catch(() => { });
        return;
      }
    }

    let startMsg = null;
    if (message) {
      const startEmbed = new EmbedBuilder()
        .setColor('#00f0ff')
        .setDescription(resolveEmojis(bot, '{START} **Execution Started**'));
      startMsg = await message.channel.send({ embeds: [startEmbed] }).catch(() => null);
    }

    logger.info(targetName ? `Deleting ${channels.size} channels named "${targetName}"...` : `Deleting ${channels.size} channels...`);
    logger.divider();

    let success = 0;
    let failed = 0;
    const total = channels.size;
    const channelsArr = [...channels.values()];

    const BATCH = 50;
    for (let i = 0; i < channelsArr.length; i += BATCH) {
      const batch = channelsArr.slice(i, i + BATCH).map(channel =>
        channel.delete()
          .then(() => {
            success++;
            // logger.success(`Channel deleted: ${channel.name}`);
            logger.progress(success + failed, total);
          })
          .catch(() => {
            failed++;
            // logger.error(`Failed: ${channel.name}`);
            logger.progress(success + failed, total);
          })
      );
      await Promise.all(batch);
    }

    logger.divider();
    console.log(`\n${chalk.green(`SUCCESS: ${success}/${total} channels deleted`)}${failed ? chalk.yellow(` (${failed} failed)`) : ''}`);

    if (startMsg) {
      const completeEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setDescription(resolveEmojis(bot, '{SUCCESS} **Execution Complete**'));
      startMsg.edit({ embeds: [completeEmbed] }).catch(() => { });
    }
  },
};
