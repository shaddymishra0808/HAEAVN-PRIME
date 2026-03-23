const chalk = require('chalk');
const logger = require('../utils/logger');

const { EmbedBuilder } = require('discord.js');

function reply(message, text, color = '#00f0ff') {
  if (message && message.channel && typeof message.channel.send === 'function') {
    const embed = new EmbedBuilder().setColor(color).setDescription(text);
    return message.channel.send({ embeds: [embed] }).catch(() => { });
  }
}

module.exports = {
  name: 'cleanSpam',
  description: 'Clean specific spam messages across all text channels',
  async execute(guild, args, message = null) {
    const targetText = args.join(' ');

    if (!targetText) {
      if (message) {
        return reply(message, '**Usage:**\n`+cleanSpam <text>`\nExample: `+cs @everyone`');
      }
      logger.error('Usage: cleanSpam <target text>');
      return;
    }

    const textChannels = guild.channels.cache.filter(c =>
      c.isTextBased() &&
      c.permissionsFor(guild.members.me)?.has('ViewChannel') &&
      c.permissionsFor(guild.members.me)?.has('ManageMessages')
    );

    if (textChannels.size === 0) {
      logger.error('No accessible text channels with Manage Messages permission found.');
      return;
    }

    logger.info(`Scanning ${textChannels.size} channels for messages containing: "${targetText}"`);
    logger.divider();

    let totalDeleted = 0;
    const totalChannels = textChannels.size;
    let processedChannels = 0;

    const channelTasks = [...textChannels.values()].map(async (channel) => {
      try {
        const fetched = await channel.messages.fetch({ limit: 100 });

        // Filter messages that include the target text
        const messagesToDelete = fetched.filter(msg => {
          // Check if message object is valid and its content includes target text
          return msg && typeof msg.content === 'string' && msg.content.includes(targetText) && msg.deletable;
        });

        if (messagesToDelete.size > 0) {
          // bulkDelete(messages, filterOld) - filterOld = true skips messages older than 14 days without throwing error
          const deleted = await channel.bulkDelete(messagesToDelete, true);
          totalDeleted += deleted.size;
        }
      } catch (err) {
        // Ignore errors for individual channels (e.g., missing access to history)
      } finally {
        processedChannels++;
        logger.progress(processedChannels, totalChannels, `Scanning #${channel.name}`);
      }
    });

    await Promise.all(channelTasks);

    logger.divider();
    console.log(`\n${chalk.green(`SUCCESS: Cleaned up ${totalDeleted} spam messages across ${textChannels.size} channels`)}`);
  },
};
