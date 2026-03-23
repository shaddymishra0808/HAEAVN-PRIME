const { EmbedBuilder } = require('discord.js');
const prefixManager = require('../utils/prefixManager');
const config = require('../config');

module.exports = {
    name: 'prefix',
    description: 'Change the command prefix for this server',
    aliases: ['setprefix'],
    async execute(guild, args = [], message = null) {
        if (!message) return;

        const newPrefix = args[0];
        const sendEmbed = (text, color = '#ff0000') => message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(text)] }).catch(() => { });

        if (!newPrefix) {
            const currentPrefix = prefixManager.getPrefix(guild.id);
            return sendEmbed(`ℹ️ **Current Prefix:** \`${currentPrefix}\`\n**Usage:** \`${currentPrefix}prefix <NewPrefix>\``, '#00f0ff');
        }

        if (newPrefix.length > 5) {
            return sendEmbed('❌ Prefix cannot be longer than 5 characters.');
        }

        if (newPrefix.toLowerCase() === 'reset') {
            prefixManager.setPrefix(guild.id, config.prefix);
            return sendEmbed(`✅ Server prefix reset to default: \`${config.prefix}\``, '#00ff00');
        }

        prefixManager.setPrefix(guild.id, newPrefix);
        sendEmbed(`✅ Server prefix successfully changed to: \`${newPrefix}\``, '#00ff00');
    }
};
