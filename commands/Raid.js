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
        const raiderRole = raids.raiderRole(msg, args, params);

        const members = new Discord.Collection();

        const content = raids.signUpRoster(msg, members, raiderRole, params);

        // Add react messages
        msg.channel.send(raids.startmsg, { embed: content })
            .then((raid) => {
                raid.pin(); // Pin the message on the channel
                raid.react(raids.autoSignUp)
                    .then(raid.react(raids.manualSignUp)
                        .then(raid.react(raids.cancelSignUp)
                            .then(raids.registerRaid(raid, members, raiderRole, params, true))));
            });
    }
}