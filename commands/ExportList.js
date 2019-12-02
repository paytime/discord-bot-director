const fs = require('fs');
const file = './members.csv';

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

        // Create the csv-file with the contents
        fs.writeFile(file, exportlist, err => {
            if (err) throw new Error('Could not create or write to file.\n' + err);
        });

        // Write a reply message and attach the file
        msg.reply(`Done! This server has ${exportlist.length - 1} members.`, {
            files: [file]
        });

        // Finally remove the csv file again
        fs.unlink(file, err => {
            if (err) throw new Error('Could not remove file.\n' + err);
        })

        return false;
    }
}