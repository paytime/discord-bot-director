const fs = require('fs');
const file = './list.json';

module.exports = {
    name: 'let',
    description: "Gives (or removes) a role the permission to assign specific roles to other users.\nSyntax: `@bot Let <Assigner_Role> [Not] Set <Other_Role_1> [<Other_Role_2 ...]`\n**ADMINS ONLY**",
    execute(msg, args, list) {
        if (!msg.member.hasPermission('ADMINISTRATOR')) {
            throw new Error('User is not an admin.');
        }

        // Gets the user's role's highest position. User's will lower roles cannot set higher roles.
        const memberRolePos = msg.member.highestRole.position;

        // Check if there are enough args
        if (args.length < 3) {
            throw new Error('Not enough args.');
        }

        // Check if assigner role is valid
        if (args[0].length < 7 || args[0].length > 28 || !args[0].startsWith('<@&')) {
            throw new Error('Invalid assigner role');
        }

        let assigner = null; // Contains the assigner role
        const assignableRoles = []; // Contains all assignable roles
        let isRemovingRoles = false; // If true, then assigner will not have the permission anymore to set the other roles; if false, then the assigner is getting the permission to assign roles

        // Check if the args are properly set
        if (args[1] !== 'set') {
            if (args[1] === 'not' && args[2] === 'set' && args.length > 3) { // The assigner role is losing permission to set roles
                isRemovingRoles = true;
            } else { // Invalid case
                throw new Error('set/not set args aren\'t set properly.');
            }
        }

        // Get all of the server's roles
        const roles = msg.guild.roles;

        // Get the assigner role
        const assignerString = args[0].substr(3, args[0].length - 4);
        assigner = roles.get(assignerString);

        // Check if the assigner role exists
        if (!assigner) {
            throw new Error(`Couldn't find role: ${args[0]}`);
        }

        // Check if the user's role position is higher than the assigner role position
        if (memberRolePos <= assigner.position) {
            throw new Error('Assigner role has a higher position than the user\'s roles.');
        }

        // Get the other role(s)
        const remainderArgs = args.slice(isRemovingRoles ? 3 : 2);
        for (let i = 0; i < remainderArgs.length; i++) {
            const item = remainderArgs[i];

            // Check if role is valid
            if (item.length < 7 || item.length > 28 || !item.startsWith('<@&')) {
                throw new Error('Invalid role');
            }

            const role = roles.get(item.substr(3, item.length - 4));

            // Check if the role exists
            if (!role) {
                throw new Error(`Couldn't find role: ${item}`);
            }

            // Check if this role has a lower position than the assigner role
            if (assigner.position <= role.position) {
                throw new Error('Role has a higher position than the assigner role.')
            }

            assignableRoles.push(role.id);
        }

        // Finally save the assigner with its assignable roles to a list.
        // First, let's check if the assigner is already in the list
        const listAssigner = list.find(x => x.assigner === assigner.id);

        if (listAssigner) { // Assigner role is already in the list. Just update the entry itself then.
            for (let i = 0; i < assignableRoles.length; i++) {
                const role = assignableRoles[i];

                if (isRemovingRoles && listAssigner.assignableRoles.includes(role)) { // Remove role
                    listAssigner.assignableRoles = listAssigner.assignableRoles.filter(x => x !== role);
                } else if (!isRemovingRoles && !listAssigner.assignableRoles.includes(role)) { // Add role
                    listAssigner.assignableRoles.push(role);
                }
            }

            // Clear entries that have no assignable roles
            if (listAssigner.assignableRoles.length === 0) {
                list = list.filter(x => x.assigner !== listAssigner.assigner);
            }
        } else if (!isRemovingRoles) { // Assigner role isn't in the list yet. Also, can't remove roles from an assigner, if the assigner doesn't exist.
            list.push({
                assigner: assigner.id,
                assignableRoles: assignableRoles
            });
        } else return false; // If neither of these apply then just quit here

        // Update the list file to reflect the changes
        fs.writeFile(file, JSON.stringify(list), 'utf8', (err) => {
            if (err) throw new Error('Couldn\'t write to the list.json file: ' + err);
        });

        msg.reply('Permissions were successfully set.')

        return true;
    }
}