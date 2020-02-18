'use strict';
const Discord = require('discord.js');
const raids = require('../modules/raids');

module.exports = {
    name: 'roster',
    description: 'Posts a raid roster. Syntax: `@bot roster [@Raider]`',
    /**
     * The execute command
     * @param {Discord.Message} msg 
     * @param {Array<String>} args 
     * @param {*} params 
     */
    execute(msg, args, params) {
        let str;
        if (args && args.length > 0) {
            str = args[0];
        }

        // Get the user's raider role
        const raiderRole = raids.raiderRole(msg, str, params, false);

        // Find and store everyone with the raider role
        const members = new Discord.Collection();
        msg.guild.fetchMembers().then(guild => {
            guild.members.filter(member => member.roles.has(raiderRole)).forEach(m => {
                const raider = {
                    id: m.id,
                    roles: m.roles,
                    displayName: m.displayName
                }
                members.set(raider.id, raider);
            });

            // Post the raid roster
            const content = raids.roster(msg, members, raiderRole, params);

            msg.channel.send({ embed: content });
        });
    }
}