'use strict';
const Discord = require('discord.js');

module.exports = {
    name: 'toggle',
    description: 'Toggles the role of a user. Syntax: `@bot Toggle @player @ROLE`',
    /**
     * The execute command
     * @param {Discord.Message} msg 
     * @param {Array<String>} args 
     * @param {*} params 
     */
    execute(msg, args, params) {
        // Check if the args are valid.
        if (args.length !== 2) {
            throw new Error('Wrong number of args.');
        }

        // Check if the first argument is a player
        if (args[0].length < 4 || args[0].length > 30 || !args[0].startsWith('<@')) {
            throw new Error('The first argument is not a discord user');
        }

        // Check if the second argument is a role
        let roleArg = args[1];
        if (roleArg.length < 7 || roleArg.length > 28 || !roleArg.startsWith('<@&')) {
            // It's not a role id. Let's check if it's an emoji that matches a raider role id.
            const raiders = params.roles.raiders.list;
            let hasFoundRole = false;
            for (let i = 0; i < raiders.length; i++) {
                const raider = raiders[i];

                if (raider.emoji === roleArg) {
                    roleArg = `<@&${raider.id}>`;
                    hasFoundRole = true;
                    break;
                }
            }
            if (!hasFoundRole) throw new Error('Invalid role');
        }

        // Find the player
        const playerId = args[0].substr(2, args[0].length - 3).replace('!', '');
        const player = msg.guild.members.get(playerId);
        if (!player) {
            throw new Error(`Couldn't find player: ${args[0]}`);
        }

        // Find the role
        const roleId = roleArg.slice(3, -1);
        const role = msg.guild.roles.get(roleId);
        if (!role) {
            throw new Error(`Couldn't find role: ${roleArg}`);
        }

        // Admins have always the permission to change roles that have a lower position than theirs
        const isAdmin = msg.member.hasPermission('ADMINISTRATOR') && msg.member.highestRole.position > role.position;

        // Check if the message's author has the permission to toggle this role
        let hasPermission = false;

        if (isAdmin) {
            hasPermission = true;
        } else {
            params.assigns.forEach(ele => { // Check if 
                if (msg.member.roles.has(ele.assigner) && ele.assignableRoles.includes(roleId)) {
                    hasPermission = true;
                }
            });
        }

        // Finally, toggle the player's role
        if (hasPermission) {
            if (player.roles.has(roleId)) {
                player.removeRole(role);
                msg.reply(`\`@${role.name}\` has been removed from \`${player.displayName}\``);
            } else {
                player.addRole(role);
                msg.reply(`\`@${role.name}\` has been assigned to \`${player.displayName}\``);
            }
        } else {
            throw new Error(`You don\'t have the permission to toggle \`@${role.name}\``);
        }

        msg.delete();
    }
}
