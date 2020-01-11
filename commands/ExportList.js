'use strict';
const Discord = require('discord.js');

const fs = require('fs');
const file = './members.csv';

module.exports = {
    name: 'exportlist',
    description: 'Exports a csv list of all guild members.\n**ADMINS ONLY**',
    /**
     * The execute command
     * @param {Discord.Message} msg 
     * @param {Array<String>} args 
     * @param {*} params 
     */
    execute(msg, args, params) {
        if (!msg.member.hasPermission('ADMINISTRATOR')) {
            throw new Error('User is not an admin.');
        }

        // A CSV list that will contain all users of the server
        const exportlist = [];

        // Loop through list of guild members
        msg.guild.members.forEach(m => {
            // Ignore bots
            if (m.user.bot) return;

            exportlist.push(`${m.displayName};${m.user.username}#${m.user.discriminator};${m.highestRole.name};`);
        });

        // Sort the array by the nicknames
        exportlist.sort();

        // Append the header on first position
        exportlist.unshift('Nickname;Username;Highest Role;');

        const finalString = exportlist.join('\n');

        // Create the csv-file with the contents
        fs.writeFile(file, finalString, err => {
            if (err) throw new Error('Could not create or write to file.\n' + err);

            // Write a reply message and attach the file
            msg.reply(`Done! This server has ${exportlist.length - 1} members.`, {
                files: [file]
            }).then(() => { // Finally remove the csv file again
                fs.unlink(file, err => {
                    if (err) throw new Error('Could not remove file.\n' + err);
                });
            }).catch((err) => {
                throw new Error('Could not find or open file.\n' + err);
            });
        });

        return false;
    }
}