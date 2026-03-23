const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'bos',
    description: 'Shows who is currently using this bot',
    async execute(guild, args, message, ask, client) {
        if (!message) return;

        try {
            let ownerDisplay = config.ownerId || 'Unknown';

            // Try to fetch owner tag from Discord API
            if (client && config.ownerId) {
                try {
                    const ownerUser = await client.users.fetch(config.ownerId);
                    if (ownerUser) ownerDisplay = ownerUser.tag;
                } catch { /* silently use ID if fetch fails */ }
            }

            const embed = new EmbedBuilder()
                .setColor('#00f0ff')
                .setTitle('⚡ Bot Owner Status')
                .setDescription(`Currently this bot is being used by **${ownerDisplay}**`)
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });
        } catch (err) {
            console.error(`bos command error: ${err.message}`);
        }
    },
};
