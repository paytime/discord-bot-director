const Discord = require('discord.js');

module.exports = {
    name: 'exportlist',
    description: 'Exports a csv list of all guild members.\n**ADMINS ONLY**',
    execute(msg, args, list) {
        if (!msg.member.hasPermission('ADMINISTRATOR')) {
            throw new Error('User is not an admin.');
        }

        // A CSV list that will contain all users of the server
        const exportlist = [];

        // Append the header first
        exportlist.push('Nickname;Username;Highest Role');

        // Loop through list of guild members
        msg.guild.members.forEach(m => {
            // Ignore bots
            if (m.user.bot) return; 

            // If the user doesn't have a set nickname, then just take his/her username
            const nickname = m.nickname ? m.nickname : m.user.username;

            exportlist.push(`${nickname};${m.user.username}#${m.user.discriminator};${m.highestRole.name}`);
        });

        console.log(exportlist);

        msg.reply(`Done! This server has ${exportlist.length-1} members.`);

        return false;
    }
}