const { EmbedBuilder } = require('discord.js');
const { resolveEmojis } = require('../utils/emojis');

module.exports = {
    name: 'emojisync',
    description: 'Sync and list emojis from the storage server',
    async execute(guild, args, message, _ask, client) {
        if (!message || !message.channel) return;

        const query = args[0]?.toLowerCase();

        let emojis = client.emojis.cache.map(e => ({
            name: e.name,
            id: e.id,
            animated: e.animated,
            string: e.toString()
        }));

        if (query) {
            emojis = emojis.filter(e => e.name.toLowerCase().includes(query));
        }

        if (emojis.length === 0) {
            const emptyEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription(query
                    ? `❌ **No emojis found matching "${query}"!**`
                    : '❌ **No custom emojis found!**\nMake sure the bot is in your emoji storage server.');
            return message.channel.send({ embeds: [emptyEmbed] }).catch(() => { });
        }

        const embed = new EmbedBuilder()
            .setColor('#bd00ff')
            .setTitle(query ? `🔍 Emoji Search: ${query}` : '📦 Emoji Storage Sync')
            .setDescription(query
                ? `Found **${emojis.length}** emojis matching your search.`
                : `Bot has found **${emojis.length}** custom emojis total.\n\nYou can use them in any command using \`{NAME}\` format.`)
            .addFields(
                { name: query ? 'Search Results' : 'Recent Emojis', value: emojis.slice(0, 20).map(e => `${e.string} \`{${e.name}}\``).join('\n').slice(0, 1024) || 'None' }
            )
            .setFooter({ text: query ? `Showing top 20 matches` : 'Tip: Use +es <name> to search for a specific emoji!' });

        return message.channel.send({ embeds: [embed] }).catch(() => { });
    },
};
