const logger = require('./../utils/logger');
const { EmbedBuilder } = require('discord.js');
const { resolveEmojis } = require('./../utils/emojis');

function reply(bot, message, text, color = '#ff00ff') {
  if (message && message.channel && typeof message.channel.send === 'function') {
    const embed = new EmbedBuilder().setColor(color).setDescription(resolveEmojis(bot, text));
    return message.channel.send({ embeds: [embed] }).catch(() => { });
  }
}

module.exports = {
  name: 'spamAll',
  description: 'Spam all text channels with a message N times',
  async execute(guild, args, message = null, _ask, client) {
    const bot = client || message?.client;
    const count = parseInt(args[0]);
    const spamText = args.slice(1).join(' ');

    if (isNaN(count) || !spamText) {
      if (message) {
        return reply(bot, message, '{INFO} **Usage:**\n`+spamAll <count> <text>`\nExample: `+sa 10 raid by zabro`');
      }
      logger.error('Usage: spamAll <count> <message>');
      return;
    }

    const textChannels = guild.channels.cache.filter(c =>
      c.isTextBased() &&
      c.permissionsFor(guild.members.me)?.has('SendMessages')
    );

    if (textChannels.size === 0) {
      logger.error('No accessible text channels found.');
      return;
    }

    const totalExpected = textChannels.size * count;
    logger.info(`Spamming ${textChannels.size} channels × ${count} times (Total: ${totalExpected})...`);
    logger.divider();

    let totalSent = 0;
    let totalFailed = 0;

    const channelTasks = Array.from(textChannels.values()).map(async (channel) => {
      let webhook = null;
      let sender = null;

      if (channel.permissionsFor(guild.members.me)?.has('ManageWebhooks')) {
        try {
          webhook = await channel.createWebhook({
            name: guild.members.me.nickname || bot.user.username,
            avatar: bot.user.displayAvatarURL()
          });
          sender = () => webhook.send({ content: spamText });
        } catch (e) {
          sender = () => channel.send(spamText);
        }
      } else {
        sender = () => channel.send(spamText);
      }

      const BATCH = 50;
      for (let i = 0; i < count; i += BATCH) {
        const batchSize = Math.min(BATCH, count - i);
        const batch = Array.from({ length: batchSize }, () =>
          sender()
            .then(() => {
              totalSent++;
              logger.progress(totalSent + totalFailed, totalExpected, `#${channel.name}`);
            })
            .catch(() => {
              totalFailed++;
              logger.progress(totalSent + totalFailed, totalExpected, `#${channel.name}`);
            })
        );
        await Promise.all(batch);
      }

      if (webhook) await webhook.delete().catch(() => { });
    });

    await Promise.all(channelTasks);

    logger.divider();
    if (message) {
      reply(bot, message, `{SUCCESS} Successfully sent **${totalSent}/${totalExpected}** messages across **${textChannels.size}** channels.`, '#00ff00');
    }
  },
};
