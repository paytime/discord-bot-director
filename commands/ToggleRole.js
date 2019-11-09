module.exports = {
    name: 'toggle',
    description: 'Toggles the role of a user. Syntax: `@bot Toggle @player @ROLE`',
    execute(msg, args, list) {
        // Check if the args are valid.
        if (args.length !== 2) {
            throw new Error('Wrong number of args.');
        }

        // Check if the first argument is a player
        if (args[0].length < 4 || args[0].length > 30 || !args[0].startsWith('<@')) {
            throw new Error('The first argument is not a discord user');
        }

        // Find the player
        const playerId = args[0].substr(2, args[0].length - 3);
        const player = msg.guild.members.get(playerId);
        if (!player) {
            throw new Error(`Couldn't find player: ${args[0]}`);
        }

        // Find the role
        const roleId = args[1].substr(3, args[1].length - 4);
        const role = msg.guild.roles.get(roleId);
        if (!role) {
            throw new Error(`Couldn't find role: ${args[1]}`);
        }

        // Check if the message's author has the permission to toggle this role
        let hasPermission = false;
        list.forEach(ele => { // Check if 
            if (msg.member.roles.has(ele.assigner) && ele.assignableRoles.includes(roleId)) {
                hasPermission = true;
            }
        });

        // Finally, toggle the player's role
        if (hasPermission) {
            if (player.roles.has(roleId)) {
                player.removeRole(role);
            } else {
                player.addRole(role);
            }
        }

        return false;
    }
}