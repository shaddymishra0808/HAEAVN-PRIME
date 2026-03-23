const logger = require('./../utils/logger');
const permissions = require('./../utils/permissions');
const { EmbedBuilder } = require('discord.js');
const config = require('./../config');
const { resolveEmojis } = require('./../utils/emojis');

function reply(bot, message, text, color = '#ff0000') {
    if (message && message.channel && typeof message.channel.send === 'function') {
        const embed = new EmbedBuilder().setColor(color).setDescription(resolveEmojis(bot, text));
        return message.channel.send({ embeds: [embed] }).catch(() => { });
    }
}

module.exports = {
    name: 'massBan',
    description: 'Ban users (except whitelisted users/roles)',
    async execute(guild, limitInput = Infinity, message = null, _ask, client) {
        const bot = client || message?.client;
        if (message && message.author.id !== config.ownerId) {
            return reply(bot, message, '{ERROR} Only the bot owner can use massBan.', '#ff0000');
        }

        let limit = limitInput;
        if (typeof limitInput === 'object' && Array.isArray(limitInput)) {
            const arg = limitInput[0]?.toLowerCase();
            if (!arg) {
                if (message) return reply(bot, message, '{INFO} **Usage:**\n`+massBan <count>` or `+mb all`');
                limit = Infinity;
            } else if (arg === 'all') {
                limit = Infinity;
            } else {
                limit = parseInt(arg);
                if (isNaN(limit)) {
                    if (message) return reply(bot, message, '{INFO} **Usage:**\n`+massBan <count>` or `+mb all`');
                    limit = Infinity;
                }
            }
        }
        logger.info('Fetching all members...');
        const members = await guild.members.fetch().catch(() => guild.members.cache);

        const membersToBan = members.filter(member => {
            if (member.id === bot.user.id) return false;
            if (permissions.isWhitelisted(member.id)) return false;
            let hasWhitelistedRole = false;
            if (member.roles && member.roles.cache) {
                for (const roleId of member.roles.cache.keys()) {
                    if (permissions.isWhitelisted(roleId)) {
                        hasWhitelistedRole = true;
                        break;
                    }
                }
            }
            if (hasWhitelistedRole) return false;
            if (!member.bannable) return false;
            return true;
        });

        if (membersToBan.size === 0) {
            logger.warn('No bannable members found.');
            if (message) reply(bot, message, '{WARN} No bannable members found!');
            return;
        }

        const membersArr = Array.from(membersToBan.values());
        const actualLimit = Math.min(membersArr.length, limit);
        const toBan = membersArr.slice(0, actualLimit);

        logger.info(`Banning ${toBan.length} members...`);
        logger.divider();

        let success = 0;
        let failed = 0;

        const BATCH = 50;
        for (let i = 0; i < toBan.length; i += BATCH) {
            const batch = toBan.slice(i, i + BATCH).map(member =>
                member.ban({ reason: 'Mass Ban Command Executed' })
                    .then(() => {
                        success++;
                        logger.progress(success + failed, toBan.length, member.user.tag);
                    })
                    .catch(() => {
                        failed++;
                        logger.progress(success + failed, toBan.length, member.user.tag);
                    })
            );
            await Promise.all(batch);
        }

        if (message) {
            reply(bot, message, `{SUCCESS} Successfully banned **${success}/${actualLimit}** members.`, '#00ff00');
        }
    },
};
