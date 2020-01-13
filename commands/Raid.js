'use strict';
const Discord = require('discord.js');
const raids = require('../modules/raids');

module.exports = {
    name: 'raid',
    description: 'Creates a new raid event for the user\'s main raid. Optionally a different raid can be specified. Syntax: `@bot raid [@Raider]`',
    /**
     * The execute command
     * @param {Discord.Message} msg 
     * @param {Array<String>} args 
     * @param {*} params 
     */
    execute(msg, args, params) {
        // Delete the message first
        msg.delete();

        if (!args || args.length < 2 || !args[0] || !args[1]) {
            throw new Error('Wrong input. Check the description with `@bot ?raid`');
        }

        // Second, check the date. The format is 'dd-mm-yyyy/HH:MM'. Example: 01-01-2020/19:30
        const date = raids.getdate(args[0]);

        // Third, determine the raider role
        const raiderRole = raids.raiderRole(msg, args[1], params);

        // Create the message and add reactions
        raids.createRaidEvent(msg, raiderRole, params, date);
    }
}