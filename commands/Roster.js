'use strict';
const Discord = require('discord.js');
const raids = require('../modules/raids');

module.exports = {
    name: 'roster',
    description: 'Displays the raid roster of the user\'s raid group or of a specified raid. Syntax: `@bot roster [@Raider]`',
    /**
     * The execute command
     * @param {Discord.Message} msg 
     * @param {Array<String>} args 
     * @param {*} params 
     */
    execute(msg, args, params) {
        // Get the user's raider role
        const raiderRole = raids.raiderRole(msg, args, params);

        // Find and store everyone with the raider role
        const members = msg.guild.members.filter(member => member.roles.has(raiderRole));

        // Post the raid roster
        const content = raids.roster(msg, members, raiderRole, params);

        msg.channel.send({ embed: content });
    }
}