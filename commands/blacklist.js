const logger = require('./../utils/logger');
const permissions = require('./../utils/permissions');
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
    name: 'blacklist',
    aliases: ['bl'],
    description: 'Blacklist a user so they can never use the bot anywhere.',
    async execute(guild, args, message, _ask, client) {
        const bot = client || message?.client;
        if (message && message.author.id !== config.ownerId) {
            return reply(bot, message, '{ERROR} Only the bot owner can manage the blacklist.', '#ff0000');
        }

        const sub = (args[0] || '').toLowerCase();

        if (sub === 'list') {
            const bl = permissions.getBlacklist();
            const lines = [resolveEmojis(bot, '{BLOCK} **Blacklist Status**')];

            lines.push(resolveEmojis(bot, '\n**{GLOBAL} [GLOBAL]**'));
            if (bl.global.length === 0) lines.push('• None');
            else bl.global.forEach((id, i) => lines.push(`${i + 1}. \`${id}\``));

            if (guild && bl.servers && bl.servers[guild.id]) {
                const s = bl.servers[guild.id];
                lines.push(resolveEmojis(bot, `\n**{LOCK} [THIS SERVER: ${guild.name}]**`));
                if (s.length === 0) lines.push('• None');
                else s.forEach((id, i) => lines.push(`${i + 1}. \`${id}\``));
            }
            return reply(bot, message, lines.join('\n'));
        }

        if (!['add', 'remove'].includes(sub)) {
            return reply(
                bot,
                message,
                '{INFO} **Usage:**\n' +
                '`+blacklist list` — show all blacklisted users\n' +
                '`+blacklist add <here|global> <userId>`\n' +
                '`+blacklist remove <userId>`' +
                '\n\n**Example:** `+bl add global 123456789`'
            );
        }

        if (sub === 'add') {
            const scope = (args[1] || '').toLowerCase();
            if (!['here', 'global'].includes(scope)) {
                return reply(bot, message, '{ERROR} Specify scope as `here` or `global`.');
            }

            let userId = args[2];
            if (!userId && message.mentions.users.size > 0) {
                userId = message.mentions.users.first().id;
            } else if (userId) {
                userId = userId.replace(/[<@!>]/g, '');
            }

            if (!userId) return reply(bot, message, '{ERROR} Specify a User ID or mention.', '#ff0000');

            if (userId === config.ownerId) {
                return reply(bot, message, '{ERROR} You cannot blacklist yourself (the owner).', '#ff0000');
            }

            let nameToDisplay = `\`${userId}\``;
            try {
                const u = await bot.users.fetch(userId).catch(() => null);
                if (u) nameToDisplay = `**${u.tag}** (\`${userId}\`)`;
            } catch (e) { }

            const ok = permissions.addBlacklist(userId, scope, guild?.id);
            if (ok) {
                return reply(bot, message, `{BLOCK} User ${nameToDisplay} has been added to the **${scope} blacklist**.`, '#ff0000');
            }
            return reply(bot, message, `{WARN} User ${nameToDisplay} is already in the ${scope} blacklist.`);
        }

        if (sub === 'remove') {
            let userId = args[1];
            if (!userId && message.mentions.users.size > 0) {
                userId = message.mentions.users.first().id;
            } else if (userId) {
                userId = userId.replace(/[<@!>]/g, '');
            }

            if (!userId) return reply(bot, message, '{ERROR} Specify a User ID to remove.', '#ff0000');

            let nameToDisplay = `\`${userId}\``;
            try {
                const u = await bot.users.fetch(userId).catch(() => null);
                if (u) nameToDisplay = `**${u.tag}** (\`${userId}\`)`;
            } catch (e) { }

            const ok = permissions.removeBlacklist(userId, guild?.id);
            if (ok) {
                return reply(bot, message, `{SUCCESS} User ${nameToDisplay} has been removed from all blacklists.`, '#00ff00');
            }
            return reply(bot, message, `{WARN} User ${nameToDisplay} was not found in any blacklist.`);
        }
    },
};
