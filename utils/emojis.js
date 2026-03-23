const logger = require('./logger');

/**
 * Resolves emoji names in a string to actual Discord emoji strings.
 * Format: {EMOJI_NAME}
 * @param {import('discord.js').Client} client 
 * @param {string} text 
 * @returns {string}
 */
const resolveEmojis = (client, text) => {
    if (!text || typeof text !== 'string') return text;

    return text.replace(/\{(\w+)\}/g, (match, name) => {
        // Try finding by name (case-insensitive)
        const emoji = client.emojis.cache.find(e => e.name.toLowerCase() === name.toLowerCase());

        if (emoji) {
            // console.log(`[EMOJI] Matched {${name}} -> ID:${emoji.id}`); // Optional debug
            return emoji.toString();
        }

        // console.warn(`[EMOJI] Not found in cache: {${name}}`); // Optional debug

        // Fallbacks
        const fallbacks = {
            'success': '✅',
            'error': '❌',
            'info': 'ℹ️',
            'warn': '⚠️',
            'nuke': '💥',
            'crown': '👑',
            'loading': '⏳',
            'online': '🟢',
            'offline': '🔴'
        };

        return fallbacks[name.toLowerCase()] || match;
    });
};

/**
 * Simple helper to get a single emoji by name
 */
const getEmoji = (client, name) => {
    const emoji = client.emojis.cache.find(e => e.name.toLowerCase() === name.toLowerCase());
    return emoji ? emoji.toString() : `:${name}:`;
};

module.exports = { resolveEmojis, getEmoji };
