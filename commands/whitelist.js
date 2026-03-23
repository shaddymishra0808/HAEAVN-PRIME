const logger = require('./../utils/logger');
const permissions = require('./../utils/permissions');
const config = require('./../config');
const { EmbedBuilder } = require('discord.js');
const { resolveEmojis } = require('./../utils/emojis');

const typeMap = {
  user: 'users',
  channel: 'channels',
  role: 'roles',
};

function reply(bot, message, text, color = '#bd00ff') {
  if (message && message.channel && typeof message.channel.send === 'function') {
    const embed = new EmbedBuilder().setColor(color).setDescription(resolveEmojis(bot, text));
    return message.channel.send({ embeds: [embed] }).catch(() => { });
  }
}

module.exports = {
  name: 'whitelist',
  description: 'Manage whitelist (protected users/channels/roles)',
  async execute(guild, args, message, _ask, client) {
    const bot = client || message?.client;
    if (message && message.author.id !== config.ownerId) {
      return reply(bot, message, '{ERROR} Only the bot owner can manage the whitelist.', '#ff0000');
    }

    const sub = (args[0] || '').toLowerCase();
    if (sub === 'list') {
      const list = permissions.getWhitelist();
      const lines = [resolveEmojis(bot, '{KEY} **Whitelist**')];
      lines.push(`• Users: ${list.users.length ? list.users.join(', ') : 'None'}`);
      lines.push(`• Channels: ${list.channels.length ? list.channels.join(', ') : 'None'}`);
      lines.push(`• Roles: ${list.roles.length ? list.roles.join(', ') : 'None'}`);
      return reply(bot, message, lines.join('\n'));
    }

    if (!['add', 'remove'].includes(sub)) {
      return reply(
        bot,
        message,
        '{INFO} **Usage:**\n`+whitelist <add|remove|list> [user|channel|role] <id>`\nExample: `+whitelist add role 123456789`'
      );
    }

    const typeInput = (args[1] || '').toLowerCase();
    const typeKey = typeMap[typeInput];
    if (!typeKey) {
      return reply(bot, message, '{ERROR} Specify type as one of: user, channel, role');
    }

    let id = args[2];
    if (!id && typeInput === 'user' && message.mentions.users.size > 0) {
      id = message.mentions.users.first().id;
    } else if (!id && typeInput === 'channel' && message.mentions.channels.size > 0) {
      id = message.mentions.channels.first().id;
    } else if (!id && typeInput === 'role' && message.mentions.roles.size > 0) {
      id = message.mentions.roles.first().id;
    }

    if (!id) {
      return reply(bot, message, '{ERROR} Specify an ID or mention to add/remove.', '#ff0000');
    }
    id = id.replace(/[<@!&#>]/g, '');

    let nameToDisplay = `\`${id}\``;
    if (guild) {
      if (typeInput === 'user') {
        try {
          const user = await bot.users.fetch(id).catch(() => null);
          if (user) nameToDisplay = `**${user.tag}** (\`${id}\`)`;
        } catch (e) { }
      } else if (typeInput === 'channel') {
        const chan = guild.channels.cache.get(id);
        if (chan) nameToDisplay = `**#${chan.name}** (\`${id}\`)`;
      } else if (typeInput === 'role') {
        const role = guild.roles.cache.get(id);
        if (role) nameToDisplay = `**${role.name}** (\`${id}\`)`;
      }
    }

    const ok = sub === 'add' ? permissions.addWhitelist(typeKey, id) : permissions.removeWhitelist(typeKey, id);
    if (ok) {
      return reply(bot, message, `{SUCCESS} ${sub === 'add' ? 'Added' : 'Removed'} ${typeInput} ${nameToDisplay} ${sub === 'add' ? 'to' : 'from'} whitelist.`, '#00ff00');
    }
    return reply(bot, message, `{WARN} ${typeInput} ${nameToDisplay} is already in/not found in whitelist.`, '#ffff00');
  },
};
