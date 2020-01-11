'use strict';
const fs = require('fs');

const assignmentsFile = './config/assignments.json';
const rolesFile = './config/roles.json';

const serverId = process.env.SERVERID;
const channelId = process.env.CHANNELID;
const invchannelId = process.env.INVCHANNELID;
const botId = process.env.BOTID;

/**
 * Read the list file and launch the bot
 * @param {*} assigns
 */
function fetchassigns(assigns) {
    fs.readFile(assignmentsFile, { encoding: 'utf8', flag: 'a+' }, (err, data) => {
        if (err) {
            throw new Error("Failed to read file assignments.json: " + err);
        }

        try {
            if (data) {
                assigns(JSON.parse(data));
            }
        } catch (err) {
            throw new Error("Failed to parse list-file: " + err);
        }
    });

    return assigns;
}

/**
 * Reads the specified roles file
 * @param {*} roles
 */
function fetchroles(roles) {
    fs.readFile(rolesFile, (err, data) => {
        if (err) { // File doesn't exist.
            throw new Error('Roles file does not exist. Check out the \'roles.example.json\' file!');
        }

        try {
            roles(JSON.parse(data));
        } catch (err) {
            throw new Error("Failed to parse list-file: " + err)
        }
    });
}

/**
 * Checks if the bot and the configuration are properly set up
 * @param {Discord.Client} bot 
 */
function checkbot(bot) {
    console.info('Trying to access server...');
    let guild = bot.guilds.get(serverId);

    if (!guild) {
        throw new Error('Could not find specified guild!');
    }

    console.info('Trying to find statistics channel...');

    let channel = guild.channels.get(channelId);

    if (!channel) {
        throw new Error('Could not find statistics channel!');
    }

    console.info('Trying to find the main/invite channel...');

    let invchannel = guild.channels.get(invchannelId);

    if (!invchannel) {
        throw new Error('Could not find main/invite channel!');
    }

    console.info('Checking if bot has Administrator privileges...');

    if (!guild.members.get(botId) || !guild.members.get(botId).hasPermission('ADMINISTRATOR')) {
        throw new Error('Bot is not an admin!');
    }
}

module.exports = {
    fetchassigns: fetchassigns,
    fetchroles: fetchroles,
    checkbot: checkbot
};