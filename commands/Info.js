'use strict';
const Discord = require('discord.js');

module.exports = {
    name: 'info',
    description: 'Explains this bot\'s functionality.\n**ADMINS ONLY**',
    /**
     * The execute command
     * @param {Discord.Message} msg 
     * @param {Array<String>} args 
     * @param {*} params 
     */
    execute(msg, args, params) {
        if (args.length > 1) {
            throw new Error('Invalid args');
        }

        if (args.length === 1) { // Show the assign permissions for a role
            // Check if the argument is a role
            if (args[0].length < 7 || args[0].length > 28 || !args[0].startsWith('<@&')) {
                throw new Error('Invalid role');
            }

            const roleId = args[0].substr(3, args[0].length - 4);
            const role = msg.guild.roles.get(roleId);
            if (!role) {
                throw new Error(`Couldn't find role: ${args[0]}`);
            }

            const res = params.assigns.find(x => x.assigner === roleId);

            if (!res) {
                msg.reply(`\`@${role.name}\` cannot assign any role(s).`);
                return false;
            }

            const roleNames = [];
            for (let i = 0; i < res.assignableRoles.length; i++) {
                const aRoleId = res.assignableRoles[i];
                const aRole = msg.guild.roles.get(aRoleId);
                if (aRole) {
                    roleNames.push(`@${aRole.name}`);
                }
            }

            msg.reply(`\`@${role.name}\` can assign the role(s): \`\`\`${roleNames.join('\n')}\`\`\``);
        } else { // Explain this bot's functionality
            msg.reply("\nI am a **role assingment and raid helper bot** for Discord. Administrators can define which role(s) can be (un)assigned by other roles.\nCommands:\n- `Info`\n- `Let`\n- `Toggle`\n- `ExportList`\nType `?<command>` (without < and >) to get the description for a command.\nYou can also type `info @Role` to see what permissions this role has.");
        }
    }
}