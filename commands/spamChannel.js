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
  name: 'spamChannel',
  description: 'Spam a single channel with a message N times',
  async execute(guild, args, message = null, _ask, client) {
    const bot = client || message?.client;
    const channelId = args[0]?.replace(/[<#>]/g, ''); // Support mentions
    const count = parseInt(args[1]);
    const spamText = args.slice(2).join(' ');

    if (!channelId || isNaN(count) || !spamText) {
      if (message) {
        return reply(bot, message, '{INFO} **Usage:**\n`+spamChannel <channelId> <count> <text>`\nExample: `+sc #general 10 raid`');
      }
      logger.error('Usage: spamChannel <channelId> <count> <message>');
      return;
    }
    if (count < 1 || count > 1000) {
      if (message) return reply(bot, message, '{ERROR} **Count must be between 1 and 1000.**');
      logger.error('Count must be between 1 and 1000.');
      return;
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      if (message) return reply(bot, message, '{ERROR} **Channel not found!**');
      logger.error(`Channel not found: ${channelId}`);
      return;
    }

    logger.info(`Spamming #${channel.name} × ${count}...`);

    let success = 0;
    let failed = 0;

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
            success++;
            logger.progress(success + failed, count, `#${channel.name}`);
          })
          .catch(() => {
            failed++;
            logger.progress(success + failed, count, `#${channel.name}`);
          })
      );
      await Promise.all(batch);
      if (i + BATCH < count) await new Promise(r => setTimeout(r, 120));
    }

    if (webhook) await webhook.delete().catch(() => { });

    if (message) {
      reply(bot, message, `{SUCCESS} Successfully sent **${success}/${count}** messages to #${channel.name}`, '#00ff00');
    }
  },
};
