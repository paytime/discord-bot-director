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

        // Loop through list of guild members
        msg.guild.members.forEach(m => {
            // Ignore bots
            if (m.user.bot) return;

            // If the user doesn't have a set nickname, then just take his/her username
            const nickname = m.nickname ? m.nickname : m.user.username;

            exportlist.push(`${nickname};${m.user.username}#${m.user.discriminator};${m.highestRole.name};`);
        });

        // Sort the array by the nicknames
        exportlist.sort();

        // Append the header on first position
        exportlist.unshift('Nickname;Username;Highest Role;');

        // Create the csv-file with the contents
        fs.writeFile(file, { encoding: 'utf8' }, exportlist.join('\n') + '\n', err => {
            if (err) throw new Error('Could not create or write to file.\n' + err);

            // Write a reply message and attach the file
            msg.reply(`Done! This server has ${exportlist.length - 1} members.`, {
                files: [file]
            }).then(() => { // Finally remove the csv file again
                /*fs.unlink(file, err => {
                    if (err) throw new Error('Could not remove file.\n' + err);
                });*/
            }).catch((err) => {
                throw new Error('Could not find or open file.\n' + err);
            });
        });

        return false;
    }
}