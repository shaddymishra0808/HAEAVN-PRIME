const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    name: 'steal',
    aliases: ['addemoji', 'stealemoji'],
    description: 'Steal/Add a custom emoji to the current server',
    async execute(guild, args, message) {
        if (!message || !message.guild) return;

        // Permission Check: Manage Emojis and Stickers
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
            const err = new EmbedBuilder().setColor('#ff0000').setDescription('❌ **You need "Manage Emojis" permission to use this!**');
            return message.channel.send({ embeds: [err] }).catch(() => { });
        }

        const rawEmoji = args[0];
        if (!rawEmoji) {
            const usage = new EmbedBuilder().setColor('#bd00ff').setDescription('**Usage:** `+steal <emoji> [name]`\n\n**Example:** `+steal :cool_emoji: my_new_name`');
            return message.channel.send({ embeds: [usage] }).catch(() => { });
        }

        // Regex to extract URL from emoji mention <:name:id> or <a:name:id>
        let emojiId, isAnimated = false, emojiName;
        const match = rawEmoji.match(/<?(?:a:)?(\w+):(\d+)>?/);

        if (match) {
            emojiName = args[1] || match[1];
            emojiId = match[2];
            isAnimated = rawEmoji.startsWith('<a:');
        } else if (/^\d{17,20}$/.test(rawEmoji)) {
            // If only ID is provided
            emojiId = rawEmoji;
            emojiName = args[1] || `emoji_${emojiId}`;
        } else {
            const err = new EmbedBuilder().setColor('#ff0000').setDescription('❌ **Invalid emoji!** Please provide a custom emoji or a valid Emoji ID.');
            return message.channel.send({ embeds: [err] }).catch(() => { });
        }

        const extension = isAnimated ? 'gif' : 'png';
        const url = `https://cdn.discordapp.com/emojis/${emojiId}.${extension}`;

        try {
            const startEmbed = new EmbedBuilder().setColor('#00f0ff').setDescription(`🚀 **Stealing emoji...**`);
            const statusMsg = await message.channel.send({ embeds: [startEmbed] });

            const newEmoji = await message.guild.emojis.create({
                attachment: url,
                name: emojiName
            });

            const successEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Emoji Added!')
                .setDescription(`Successfully added ${newEmoji.toString()} to **${message.guild.name}**\n\n**Name:** \`${emojiName}\`\n**Placeholder:** \`{${emojiName}}\``)
                .setThumbnail(url);

            await statusMsg.edit({ embeds: [successEmbed] }).catch(() => { });
            logger.info(`Emoji stolen: ${emojiName} in ${message.guild.name} by ${message.author.tag}`);
        } catch (err) {
            logger.error(`Failed to steal emoji: ${err.message}`);
            const errEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription(`❌ **Failed to add emoji:** ${err.message}\n\n*Check if the server has empty emoji slots or if the bot has permissions.*`);
            message.channel.send({ embeds: [errEmbed] }).catch(() => { });
        }
    },
};
