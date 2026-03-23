const logger = require('./../utils/logger');
const noprefix = require('./../utils/noprefix');
const config = require('./../config');
const { EmbedBuilder } = require('discord.js');
const { resolveEmojis } = require('./../utils/emojis');

function reply(bot, message, text, color = '#bd00ff') {
    if (message && message.channel && typeof message.channel.send === 'function') {
        const embed = new EmbedBuilder().setColor(color).setDescription(resolveEmojis(bot, text));
        return message.channel.send({ embeds: [embed] }).catch(() => { });
    }
}

module.exports = {
    name: 'noprefix',
    aliases: ['np'],
    description: 'Manage users who can use commands without a prefix',
    async execute(_guild, args, message, _ask, client) {
        const bot = client || message?.client;
        if (message && message.author.id !== config.ownerId) {
            return reply(bot, message, '{ERROR} Only the bot owner can manage the no-prefix list.', '#ff0000');
        }

        const sub = (args[0] || '').toLowerCase();
        if (sub === 'list') {
            const list = noprefix.getNoPrefixList();
            const embed = new EmbedBuilder()
                .setColor('#bd00ff')
                .setAuthor({ name: 'HEAVEN PRIME No-Prefix List', iconURL: bot.user.displayAvatarURL() })
                .setDescription(resolveEmojis(bot, list.length ? list.map(id => `{USER} <@${id}> (ID: \`${id}\`)`).join('\n') : '{INFO} *No users in the list.*'))
                .setFooter({ text: `Total: ${list.length}` });
            return message.channel.send({ embeds: [embed] }).catch(() => { });
        }

        let action = 'add';
        let target = args[0];

        if (['add', 'remove'].includes(sub)) {
            action = sub;
            target = args[1];
        }

        if (!target && !message.mentions.users.size) {
            const embed = new EmbedBuilder()
                .setColor('#bd00ff')
                .setAuthor({ name: 'HEAVEN PRIME No-Prefix', iconURL: bot.user.displayAvatarURL() })
                .setDescription(resolveEmojis(bot, 'Manage users who can bypass the command prefix requirement.'))
                .addFields(
                    { name: resolveEmojis(bot, '{INFO} View List'), value: `\`${config.prefix}np list\``, inline: true },
                    { name: resolveEmojis(bot, '📥 Add User'), value: `\`${config.prefix}np add <@user|ID>\``, inline: true },
                    { name: resolveEmojis(bot, '📤 Remove User'), value: `\`${config.prefix}np remove <@user|ID>\``, inline: true }
                )
                .setFooter({ text: 'Tip: You can also use "np <@user>" to quickly add a user.' });
            return message.channel.send({ embeds: [embed] }).catch(() => { });
        }

        let id = target;
        if (message.mentions.users.size > 0) {
            id = message.mentions.users.first().id;
        } else {
            id = (id || '').replace(/[<@!>]/g, '');
        }

        if (!id) {
            return reply(bot, message, '{ERROR} Specify a valid user ID or mention.', '#ff0000');
        }

        if (action === 'add') {
            const added = noprefix.addNoPrefix(id);
            if (added) {
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setDescription(resolveEmojis(bot, `{SUCCESS} **Added <@${id}> to the no-prefix list.**`));
                return message.channel.send({ embeds: [embed] }).catch(() => { });
            } else {
                const embed = new EmbedBuilder()
                    .setColor('#ffff00')
                    .setDescription(resolveEmojis(bot, `{WARN} **<@${id}> is already in the no-prefix list.**`));
                return message.channel.send({ embeds: [embed] }).catch(() => { });
            }
        } else if (action === 'remove') {
            const removed = noprefix.removeNoPrefix(id);
            if (removed) {
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setDescription(resolveEmojis(bot, `{SUCCESS} **Removed <@${id}> from the no-prefix list.**`));
                return message.channel.send({ embeds: [embed] }).catch(() => { });
            } else {
                const embed = new EmbedBuilder()
                    .setColor('#ffff00')
                    .setDescription(resolveEmojis(bot, `{WARN} **<@${id}> is not in the no-prefix list.**`));
                return message.channel.send({ embeds: [embed] }).catch(() => { });
            }
        }
    },
};
