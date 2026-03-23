const { EmbedBuilder } = require('discord.js');
const chalk = require('chalk');
const logger = require('../utils/logger');
const permissions = require('../utils/permissions');

module.exports = {
  name: 'deleteRoles',
  description: 'Delete all roles (except whitelisted)',
  async execute(guild, args = [], message = null) {
    const targetName = args.join(' ').toLowerCase();
    const config = require('../config');

    if (targetName === 'help' || targetName === 'usage') {
      const embed = new EmbedBuilder()
        .setColor('#ffaa00')
        .setTitle('🎭 Delete Roles')
        .setDescription('Deletes roles from the server (except whitelisted and @everyone).')
        .addFields(
          { name: '🧹 Delete All', value: `\`${config.prefix}dr\``, inline: true },
          { name: '🎯 Delete Specific', value: `\`${config.prefix}dr <role-name>\``, inline: true }
        )
        .setFooter({ text: 'Warning: This action cannot be undone!' });
      return message.channel.send({ embeds: [embed] }).catch(() => { });
    }

    const roles = guild.roles.cache.filter(r => {
      if (r.name === '@everyone' || permissions.isWhitelisted(r.id) || !r.editable) return false;
      if (targetName && r.name.toLowerCase() !== targetName) return false;
      return true;
    });

    if (roles.size === 0) {
      if (message) message.channel.send(`❌ No deletable roles found${targetName ? ` named "${targetName}"` : ''}.`).catch(() => { });
      logger.warn(targetName ? `No deletable roles found named "${targetName}".` : 'No deletable roles found.');
      return;
    }

    if (message) {
      const confirmEmbed = new EmbedBuilder()
        .setColor('#ffaa00')
        .setDescription(`⚠️ **WARNING:** You are about to delete **${roles.size}** ${targetName ? `roles named "${targetName}"` : 'roles'}.\n\nAre you sure? Type \`yes\` to confirm or \`no\` to cancel. (15s timeout)`);

      await message.channel.send({ embeds: [confirmEmbed] });

      const filter = m => m.author.id === message.author.id;
      try {
        const collected = await message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });
        const response = collected.first().content.toLowerCase();
        if (response !== 'yes' && response !== 'y') {
          message.channel.send('❌ **Cancelled deletion.**').catch(() => { });
          return;
        }
      } catch (e) {
        message.channel.send('⏳ **Confirmation timed out. Cancelled.**').catch(() => { });
        return;
      }
    }

    let startMsg = null;
    if (message) {
      const startEmbed = new EmbedBuilder()
        .setColor('#00f0ff')
        .setDescription('🚀 **Execution Started**');
      startMsg = await message.channel.send({ embeds: [startEmbed] }).catch(() => null);
    }

    logger.info(targetName ? `Deleting ${roles.size} roles named "${targetName}"...` : `Deleting ${roles.size} roles...`);
    logger.divider();

    let success = 0;
    let failed = 0;
    const total = roles.size;
    const rolesArr = [...roles.values()];

    const BATCH = 50;
    for (let i = 0; i < rolesArr.length; i += BATCH) {
      const batch = rolesArr.slice(i, i + BATCH).map(role =>
        role.delete()
          .then(() => {
            success++;
            logger.success(`Role deleted: ${role.name}`);
            logger.progress(success + failed, total);
          })
          .catch(() => {
            failed++;
            logger.error(`Failed: ${role.name}`);
            logger.progress(success + failed, total);
          })
      );
      await Promise.all(batch);
    }

    logger.divider();
    console.log(`\n${chalk.green(`SUCCESS: ${success}/${total} roles deleted`)}${failed ? chalk.yellow(` (${failed} failed)`) : ''}`);

    if (startMsg) {
      const completeEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setDescription('✅ **Execution Complete**');
      startMsg.edit({ embeds: [completeEmbed] }).catch(() => { });
    }
  },
};
