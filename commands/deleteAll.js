const { EmbedBuilder } = require('discord.js');
const chalk = require('chalk');
const logger = require('../utils/logger');
const deleteChannels = require('./deleteChannels');
const deleteRoles = require('./deleteRoles');
const { resolveEmojis } = require('../utils/emojis');

module.exports = {
  name: 'deleteAll',
  description: 'Delete ALL channels and roles at once',
  async execute(guild, args = [], message = null, _ask, client) {
    const config = require('../config');
    const sub = (args[0] || '').toLowerCase();
    const bot = client || message?.client;

    if (sub === 'help' || sub === 'usage') {
      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle(resolveEmojis(bot, '{NUKE} Nuke Everything'))
        .setDescription(resolveEmojis(bot, 'Deletes ALL channels and roles in the server (except whitelisted).'))
        .addFields(
          { name: resolveEmojis(bot, '{WARN} Execute Nuke'), value: `\`${config.prefix}da\``, inline: true }
        )
        .setFooter({ text: 'Warning: This will destroy the server layout!' });
      return message.channel.send({ embeds: [embed] }).catch(() => { });
    }

    if (message) {
      const confirmEmbed = new EmbedBuilder()
        .setColor('#ffaa00')
        .setDescription(resolveEmojis(bot, `{WARN} **NUKE WARNING:** You are about to delete **ALL channels** and **ALL roles**.\n\nAre you sure? Type \`yes\` to confirm or \`no\` to cancel. (15s timeout)`));

      await message.channel.send({ embeds: [confirmEmbed] });

      const filter = m => m.author.id === message.author.id;
      try {
        const collected = await message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });
        const response = collected.first().content.toLowerCase();
        if (response !== 'yes' && response !== 'y') {
          message.channel.send(resolveEmojis(bot, '{ERROR} **Cancelled nuke.**')).catch(() => { });
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

    logger.divider();
    console.log(chalk.red.bold('  NUKE MODE — Deleting ALL channels + roles'));
    logger.divider();

    console.log(chalk.yellow('  ► Initiating parallel deletion of channels and roles...'));
    await Promise.all([
      deleteChannels.execute(guild, [], null, null, bot),
      deleteRoles.execute(guild, [], null, null, bot)
    ]);

    logger.divider();
    console.log(chalk.red.bold('  NUKE COMPLETE'));
    logger.divider();

    if (startMsg) {
      const completeEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setDescription(resolveEmojis(bot, '{SUCCESS} **Execution Complete**'));
      startMsg.edit({ embeds: [completeEmbed] }).catch(() => { });
    }
  },
};
