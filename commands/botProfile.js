const { EmbedBuilder } = require('discord.js');
const https = require('https');
const http = require('http');
const chalk = require('chalk');
const logger = require('../utils/logger');
const config = require('../config');

// ─── Helper: Download image URL as Buffer ────────────────────────────────────
function downloadImage(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                // Follow redirects
                return downloadImage(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode} while downloading image`));
            }
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

// ─── Helper: Set avatar safely (supports URL and local buffer) ───────────────
async function safeSetAvatar(clientUser, value) {
    // Try directly first (works for node.js, may work in some pkg builds)
    try {
        await clientUser.setAvatar(value);
        return { success: true };
    } catch (e1) {
        // If direct URL failed, try downloading as buffer
        if (value.startsWith('http://') || value.startsWith('https://')) {
            try {
                const buf = await downloadImage(value);
                const base64 = `data:image/png;base64,${buf.toString('base64')}`;
                await clientUser.setAvatar(base64);
                return { success: true };
            } catch (e2) {
                return { success: false, error: e2.message };
            }
        }
        return { success: false, error: e1.message };
    }
}

// ─── Helper: Set banner safely ────────────────────────────────────────────────
async function safeSetBanner(clientUser, value) {
    try {
        await clientUser.setBanner(value);
        return { success: true };
    } catch (e1) {
        if (value.startsWith('http://') || value.startsWith('https://')) {
            try {
                const buf = await downloadImage(value);
                const base64 = `data:image/png;base64,${buf.toString('base64')}`;
                await clientUser.setBanner(base64);
                return { success: true };
            } catch (e2) {
                return { success: false, error: e2.message };
            }
        }
        return { success: false, error: e1.message };
    }
}

module.exports = {
    name: 'botProfile',
    description: 'Change bot nickname, global avatar, bio or banner',
    aliases: ['bp'],
    ownerOnly: true,
    async execute(guild, args = [], message = null, ask = null, client = null) {
        if (message) {
            const sendEmbed = (text, color = '#ff0000') =>
                message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(text)] }).catch(() => { });

            if (message.author.id !== config.ownerId) {
                return sendEmbed('❌ Only the bot owner can use this command!');
            }

            if (args.length < 2) {
                return sendEmbed(
                    '**Usage:**\n' +
                    '`+bp name <NewName>` — change server nickname\n' +
                    '`+bp avatar <URL>` — change global profile icon\n' +
                    '`+bp bio <Text>` — update global bio (About Me)\n' +
                    '`+bp banner <URL>` — update global banner (Nitro needed)',
                    '#bd00ff'
                );
            }

            const action = args[0].toLowerCase();
            const value = args.slice(1).join(' ');

            if (action === 'name' || action === 'nickname') {
                try {
                    await guild.members.me.setNickname(value.toLowerCase() === 'reset' ? null : value);
                    sendEmbed(`✅ Server nickname ${value.toLowerCase() === 'reset' ? 'reset' : `changed to **${value}**`}.`, '#00ff00');
                } catch (e) {
                    sendEmbed(`❌ Failed to change nickname: \`${e.message}\``);
                }
            } else if (action === 'icon' || action === 'avatar' || action === 'dp') {
                const result = await safeSetAvatar(message.client.user, value);
                if (result.success) {
                    sendEmbed('✅ Global avatar updated successfully.', '#00ff00');
                } else {
                    sendEmbed(`❌ Failed to update avatar: \`${result.error}\`\n\n💡 **Tips:**\n• URL seedha image link hona chahiye (jpg/png/gif)\n• Discord bots sirf 2 baar per hour avatar badal sakte hain\n• Nitro bot nahi hai toh GIF kaam nahi karega`, '#ff0000');
                }
            } else if (action === 'bio' || action === 'about') {
                try {
                    if (!message.client.application.description) await message.client.application.fetch().catch(() => { });
                    await message.client.application.edit({ description: value.toLowerCase() === 'reset' ? '' : value });
                    sendEmbed(`✅ Global bio (About Me) ${value.toLowerCase() === 'reset' ? 'reset' : 'updated successfully'}.`, '#00ff00');
                } catch (e) {
                    sendEmbed(`❌ Failed to update bio: \`${e.message}\``);
                }
            } else if (action === 'banner') {
                const result = await safeSetBanner(message.client.user, value);
                if (result.success) {
                    sendEmbed('✅ Global banner updated successfully.', '#00ff00');
                } else {
                    sendEmbed(`❌ Failed to update banner: \`${result.error}\`\n\n💡 Banner ke liye bot ka Nitro hona zaroori hai.`, '#ff0000');
                }
            } else {
                sendEmbed(
                    '**Usage:**\n' +
                    '`+bp name <NewName>` — change server nickname\n' +
                    '`+bp avatar <URL>` — change global profile icon\n' +
                    '`+bp bio <Text>` — update global bio (About Me)\n' +
                    '`+bp banner <URL>` — update global banner (Nitro needed)',
                    '#bd00ff'
                );
            }
            return;
        }

        if (ask && client) {
            logger.divider();
            console.log(chalk.cyan.bold('  BOT PROFILE MANAGER'));
            logger.divider();

            const newName = await ask(chalk.cyan(`  New Nickname for ${guild.name} (leave blank to keep current, "reset" to clear): `));
            if (newName.trim()) {
                const val = newName.trim();
                try {
                    await guild.members.me.setNickname(val.toLowerCase() === 'reset' ? null : val);
                    logger.success(`Nickname changed to: ${val}`);
                } catch (e) {
                    logger.error(`Failed to change nickname: ${e.message}`);
                }
            }

            const newAvatar = await ask(chalk.cyan(`  New Avatar/Icon URL globally (leave blank to keep current): `));
            if (newAvatar.trim()) {
                logger.info('Updating bot avatar globally...');
                const result = await safeSetAvatar(client.user, newAvatar.trim());
                if (result.success) {
                    logger.success('Avatar successfully updated!');
                } else {
                    logger.error(`Failed to update avatar: ${result.error}`);
                    logger.warn('Tips: URL seedha image link hona chahiye | Discord 2x/hour limit hai');
                }
            }

            const newBio = await ask(chalk.cyan(`  New Bio / About Me globally (leave blank to keep current, "reset" to clear): `));
            if (newBio.trim()) {
                logger.info('Updating bot bio globally...');
                try {
                    if (!client.application.description) await client.application.fetch().catch(() => { });
                    await client.application.edit({ description: newBio.trim().toLowerCase() === 'reset' ? '' : newBio.trim() });
                    logger.success('Bio successfully updated!');
                } catch (e) {
                    logger.error(`Failed to update bio: ${e.message}`);
                }
            }

            const newBanner = await ask(chalk.cyan(`  New Banner URL globally (leave blank to keep current): `));
            if (newBanner.trim()) {
                logger.info('Updating bot banner globally...');
                const result = await safeSetBanner(client.user, newBanner.trim());
                if (result.success) {
                    logger.success('Banner successfully updated!');
                } else {
                    logger.error(`Failed to update banner: ${result.error}`);
                    logger.warn('Banner ke liye bot ka Nitro hona zaroori hai.');
                }
            }
            logger.divider();
        }
    }
};
