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
  name: 'access',
  description: 'Manage command access (Users only)',
  async execute(guild, args, message, _ask, client) {
    const bot = client || message?.client;
    if (message && message.author.id !== config.ownerId) {
      return reply(bot, message, '{ERROR} Only the bot owner can manage the access list.', '#ff0000');
    }

    const sub = (args[0] || '').toLowerCase();

    if (sub === 'list') {
      const list = permissions.getAccessList();
      const lines = [resolveEmojis(bot, '{KEY} **Access List (Users)**')];

      lines.push(resolveEmojis(bot, '\n**{GLOBAL} [GLOBAL]**'));
      lines.push(`• Users: ${list.users.length ? list.users.join(', ') : 'None'}`);

      if (guild && list.servers && list.servers[guild.id]) {
        const s = list.servers[guild.id];
        lines.push(resolveEmojis(bot, `\n**{LOCK} [THIS SERVER: ${guild.name}]**`));
        lines.push(`• Users: ${s.users.length ? s.users.join(', ') : 'None'}`);
      }

      return reply(bot, message, lines.join('\n'));
    }

    if (!['add', 'remove'].includes(sub)) {
      return reply(
        bot,
        message,
        '{INFO} **Usage:**\n' +
        '`+access list` — show all authorized users\n' +
        '`+access <add|remove> <here|global> <@user|id>`' +
        '\n\n**Example:** `+access add here @Zabro`'
      );
    }

    const scope = (args[1] || '').toLowerCase();
    if (!['here', 'global'].includes(scope)) {
      return reply(bot, message, '{ERROR} Specify scope as `here` or `global` (e.g., `+access add here @user`)');
    }

    let id = args[2];
    if (!id && message.mentions.users.size > 0) {
      id = message.mentions.users.first().id;
    } else if (id) {
      id = id.replace(/[<@!>]/g, '');
    }

    if (!id) return reply(bot, message, '{ERROR} Specify a user ID or mention to add/remove.');

    let nameToDisplay = `\`${id}\``;
    try {
      const u = await bot.users.fetch(id).catch(() => null);
      if (u) nameToDisplay = `**${u.tag}**`;
    } catch (e) { }

    if (sub === 'add') {
      const ok = permissions.addAccess(scope, 'users', id, guild?.id);
      if (ok) {
        const icon = scope === 'global' ? '{GLOBAL}' : '{LOCK}';
        const loc = scope === 'global' ? 'everywhere (GLOBAL)' : `this server (${guild?.name || 'Unknown'})`;
        return reply(bot, message, `{SUCCESS} ${icon} Added user ${nameToDisplay} to access list for ${loc}.`, '#00ff00');
      }
      return reply(bot, message, `{WARN} User ${nameToDisplay} is already in the ${scope} access list.`);
    }

    if (sub === 'remove') {
      const ok = permissions.removeAccess(scope, 'users', id, guild?.id);
      if (ok) {
        const loc = scope === 'global' ? 'everywhere (GLOBAL)' : `this server (${guild?.name || 'Unknown'})`;
        return reply(bot, message, `{SUCCESS} Removed user ${nameToDisplay} from access list for ${loc}.`, '#00ff00');
      }
      return reply(bot, message, `{WARN} User ${nameToDisplay} was not found in the ${scope} access list.`);
    }
  },
};
