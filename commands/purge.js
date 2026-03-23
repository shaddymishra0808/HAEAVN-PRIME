const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const { resolveEmojis } = require('../utils/emojis');

module.exports = {
    name: 'purge',
    description: 'Mass delete messages in the current channel',
    async execute(guild, args, message, _ask, client) {
        if (!message || !message.channel) return;
        const bot = client || message?.client;

        const amount = parseInt(args[0], 10);
        if (isNaN(amount) || amount < 1 || amount > 100) {
            const errEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription(resolveEmojis(bot, '{ERROR} **Please provide a valid number of messages to delete (1-100).**\nUsage: `+purge <amount>`'));
            return message.channel.send({ embeds: [errEmbed] }).catch(() => { });
        }

        try {
            const fetched = await message.channel.messages.fetch({ limit: amount });
            let deletedCount = 0;

            const now = Date.now();
            const fourteenDays = 14 * 24 * 60 * 60 * 1000;
            const recentMsgs = fetched.filter(m => (now - m.createdTimestamp) < fourteenDays);

            let bulkDeleted = new Map();
            if (recentMsgs.size > 0) {
                try {
                    bulkDeleted = await message.channel.bulkDelete(recentMsgs, true);
                    if (bulkDeleted && typeof bulkDeleted.size === 'number') {
                        deletedCount += bulkDeleted.size;
                    }
                } catch (err) {
                    logger.warn(`bulkDelete failed: ${err.message}, falling back`);
                }
            }

            const remainingToManuallyDelete = fetched.filter(m => {
                if (bulkDeleted && typeof bulkDeleted.has === 'function') {
                    return !bulkDeleted.has(m.id);
                }
                return true;
            });

            if (remainingToManuallyDelete.size > 0) {
                for (const msg of remainingToManuallyDelete.values()) {
                    try {
                        await msg.delete();
                        deletedCount++;
                        await new Promise(r => setTimeout(r, 800));
                    } catch (e) {
                    }
                }
            }

            const successEmbed = new EmbedBuilder()
                .setColor('#bd00ff')
                .setDescription(resolveEmojis(bot, `{SUCCESS} **Successfully deleted \`${deletedCount}\` messages.**`));

            const reply = await message.channel.send({ embeds: [successEmbed] });
            setTimeout(() => {
                if (reply && typeof reply.delete === 'function') {
                    reply.delete().catch(() => { });
                }
            }, 5000);

            logger.info(`Purged ${deletedCount} messages in #${message.channel.name} by ${message.author.tag}`);
        } catch (err) {
            logger.error(`Failed to purge messages: ${err.message}`);
            const errEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription(resolveEmojis(bot, `{ERROR} **Error purging messages:** ${err.message}`));
            message.channel.send({ embeds: [errEmbed] }).catch(() => { });
        }
    }
};
