const chalk = require('chalk');
const logger = require('../utils/logger');
const { EmbedBuilder } = require('discord.js');
const { resolveEmojis } = require('../utils/emojis');

module.exports = {
    name: 'ping',
    description: 'Replies with the bot websocket and API latency',
    async execute(guild, args, message, _ask, client) {
        if (!message) return;

        let pingValue = client.ws.ping;
        let displayPing = pingValue === -1 ? 'Calculating...' : `${pingValue}ms`;

        try {
            const embed = new EmbedBuilder()
                .setColor('#bd00ff')
                .setDescription(resolveEmojis(client, `{pings} **Pong!** Bot Latency: \`${displayPing}\``));

            const reply = await message.channel.send({ embeds: [embed] });

            if (pingValue !== -1 && reply) {
                const apiLatency = reply.createdTimestamp - message.createdTimestamp;
                embed.setDescription(resolveEmojis(client, ` **Pong!** Bot Latency: \`${displayPing}\` | API Latency: \`${apiLatency}ms\``));
                await reply.edit({ embeds: [embed] });
            }

            logger.info(`Ping command used in ${guild.name} by ${message.author.tag}`);
        } catch (err) {
            logger.error(`Failed to send ping message: ${err.message}`);
        }
    },
};
