const { EmbedBuilder, ActivityType } = require('discord.js');
const chalk = require('chalk');
const logger = require('../utils/logger');
const config = require('../config');
const { resolveEmojis } = require('../utils/emojis');

module.exports = {
    name: 'botStatus',
    description: 'Change bot presence (status and activity)',
    aliases: ['bs', 'status'],
    ownerOnly: true, // Custom flag for owner-only commands
    async execute(guild, args = [], message = null, ask = null, client = null) {
        // console.log('[DEBUG] botStatus execute called');
        // --- Discord Command Logic ---
        if (message) {
            const sendEmbed = (text, color = '#bd00ff') =>
                message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(resolveEmojis(message.client, text))] }).catch(() => { });

            if (message.author.id !== config.ownerId) {
                return sendEmbed('❌ Only the bot owner can use this command!', '#ff0000');
            }

            if (args.length < 1) {
                return sendEmbed(
                    '**Usage:**\n' +
                    '`+bs status <online|idle|dnd|invisible>`\n' +
                    '`+bs play <text>` — Set "Playing" status\n' +
                    '`+bs watch <text>` — Set "Watching" status\n' +
                    '`+bs listen <text>` — Set "Listening" status\n' +
                    '`+bs stream <text>` — Set "Streaming" status\n' +
                    '`+bs custom <text>` — Set a Custom Status message\n' +
                    '`+bs reset` — Clear all activities',
                    '#bd00ff'
                );
            }

            const subCommand = args[0].toLowerCase();
            const text = args.slice(1).join(' ');

            try {
                if (subCommand === 'status') {
                    const validStatuses = ['online', 'idle', 'dnd', 'invisible'];
                    if (!validStatuses.includes(text.toLowerCase())) {
                        return sendEmbed(`❌ Invalid status. Use: ${validStatuses.join(', ')}`, '#ff0000');
                    }
                    await message.client.user.setStatus(text.toLowerCase());
                    return sendEmbed(`✅ Status updated to **${text.toUpperCase()}**`, '#00ff00');
                }

                if (subCommand === 'play') {
                    const resText = resolveEmojis(message.client, text);
                    message.client.user.setActivity(resText, { type: ActivityType.Playing });
                    return sendEmbed(`{SUCCESS} Activity set to: **Playing ${resText}**`, '#00ff00');
                }

                if (subCommand === 'watch') {
                    const resText = resolveEmojis(message.client, text);
                    message.client.user.setActivity(resText, { type: ActivityType.Watching });
                    return sendEmbed(`{SUCCESS} Activity set to: **Watching ${resText}**`, '#00ff00');
                }

                if (subCommand === 'listen') {
                    const resText = resolveEmojis(message.client, text);
                    message.client.user.setActivity(resText, { type: ActivityType.Listening });
                    return sendEmbed(`{SUCCESS} Activity set to: **Listening to ${resText}**`, '#00ff00');
                }

                if (subCommand === 'stream') {
                    const resText = resolveEmojis(message.client, text);
                    message.client.user.setActivity(resText, { type: ActivityType.Streaming, url: 'https://twitch.tv/discord' });
                    return sendEmbed(`{SUCCESS} Activity set to: **Streaming ${resText}**`, '#00ff00');
                }

                if (subCommand === 'custom') {
                    const resText = resolveEmojis(message.client, text);
                    message.client.user.setPresence({
                        activities: [{ name: 'Custom Status', state: resText, type: ActivityType.Custom }]
                    });
                    return sendEmbed(`{SUCCESS} Custom status set to: **${resText}**`, '#00ff00');
                }

                if (subCommand === 'reset' || subCommand === 'clear') {
                    message.client.user.setActivity(null);
                    return sendEmbed('✅ Activities cleared.', '#00ff00');
                }

                return sendEmbed('❌ Invalid subcommand. Use `+bs` for help.', '#ff0000');
            } catch (err) {
                return sendEmbed(`❌ Error: \`${err.message}\``, '#ff0000');
            }
        }

        // --- Console / Terminal Logic ---
        if (ask && client) {
            logger.divider();
            console.log(chalk.cyan.bold('  BOT STATUS MANAGER'));
            logger.divider();
            console.log(chalk.white('  1) Set Status (Online, Idle, DND, Invisible)'));
            console.log(chalk.white('  2) Set Activity (Playing, Watching, etc.)'));
            console.log(chalk.white('  3) Set Custom Message (Next to icon)'));
            console.log(chalk.white('  4) Reset / Clear Status'));
            console.log(chalk.gray('  0) Back'));
            logger.divider();

            const choice = await ask(chalk.cyan('  Select option: '));
            if (choice === '1') {
                const s = await ask(chalk.yellow('  Enter status (online/idle/dnd/invisible): '));
                if (s.trim()) {
                    try {
                        await client.user.setStatus(s.trim().toLowerCase());
                        logger.success(`Status changed to: ${s.trim().toUpperCase()}`);
                    } catch (e) { logger.error(e.message); }
                }
            } else if (choice === '2') {
                console.log(chalk.gray('  Types: play, watch, listen, stream'));
                const type = await ask(chalk.yellow('  Type: '));
                const msg = await ask(chalk.yellow('  Message: '));
                if (type && msg) {
                    const activityMap = {
                        'play': ActivityType.Playing,
                        'watch': ActivityType.Watching,
                        'listen': ActivityType.Listening,
                        'stream': ActivityType.Streaming
                    };
                    const aType = activityMap[type.toLowerCase().trim()];
                    if (aType !== undefined) {
                        client.user.setActivity(msg.trim(), { type: aType, url: aType === ActivityType.Streaming ? 'https://twitch.tv/discord' : undefined });
                        logger.success('Activity updated!');
                    } else {
                        logger.error('Invalid activity type.');
                    }
                }
            } else if (choice === '3') {
                const msg = await ask(chalk.yellow('  Custom Message (Note): '));
                if (msg.trim()) {
                    const resText = resolveEmojis(client, msg.trim());
                    client.user.setPresence({
                        activities: [{ name: 'Custom Status', state: resText, type: ActivityType.Custom }]
                    });
                    logger.success(`Custom Status updated: ${resText}`);
                }
            } else if (choice === '4') {
                client.user.setActivity(null);
                logger.success('Activity cleared.');
            }
            logger.divider();
        }
    }
};
