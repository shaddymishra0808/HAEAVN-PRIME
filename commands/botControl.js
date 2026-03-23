const config = require('../config');
const { resolveEmojis } = require('../utils/emojis');

module.exports = {
    name: 'botcontrol',
    aliases: ['bc'],
    description: 'Bot control (hidden)',
    hidden: true, // won't appear in help
    async execute(guild, args, message, _ask, client, _bootFn) {
        if (!message || !message.channel) return;
        if (message.author.id !== config.ownerId) {
            return message.channel.send('❌ **Only the bot owner can perform this action.**').catch(() => { });
        }

        const sub = (args[0] || '').toLowerCase();

        // ── stop ──────────────────────────────────────────────────────────────────
        if (sub === 'stop') {
            if (client.isStopped) {
            return message.channel.send('{Zloading} **Bot is already off!**').catch(() => { });
            }
            client.isStopped = true;
            client.user.setStatus('invisible');
            return message.channel.send(resolveEmojis(client, '{OFFLINE} **Bot Is Now Offline**')).catch(() => { });
        }

        // ── start ─────────────────────────────────────────────────────────────────
        if (sub === 'start') {
            if (!client.isStopped) {
                return message.channel.send('{Zinfinity} **Bot is already online!**').catch(() => { });
            }
            client.isStopped = false;
            client.user.setStatus('online');
            return message.channel.send(resolveEmojis(client, '{ONLINE} **Bot is back ON and ready!**')).catch(() => { });
        }

        // ── unknown sub-command ───────────────────────────────────────────────────
        await message.channel
            .send('⚙️ Usage: `bc stop` | `bc start`')
            .catch(() => { });
    },
};
