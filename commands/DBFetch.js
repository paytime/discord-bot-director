'use strict';
const Discord = require('discord.js');
const db = require('../modules/db');
const fs = require('fs');

module.exports = {
    name: 'dbfetch',
    description: 'Retrieves data from the database. Syntax: `@bot dbfetch ID`',
    /**
     * The execute command
     * @param {Discord.Message} msg 
     * @param {Array<String>} args 
     * @param {*} params 
     */
    execute(msg, args, params) {
        // First, check if the user is an admin
        if (!msg.member.hasPermission('ADMINISTRATOR')) {
            throw new Error('User is not an admin.');
        }

        // Second, check if the argument is valid
        if (!args || args.length < 1 || !args[0] || !parseInt(args[0]) || args[0].length > 50) {
            throw new Error('Invalid ID.');
        }

        const ref = args[0].trim();
        let i = 0;

        db.pull(msg.client, ref, (entry) => {
            if (i > 0) return;

            //Create the file with its content
            const path = `./${ref}.json`;

            fs.writeFile(path, JSON.stringify(entry), err => {
                if (err) {
                    console.error('Could not create or write to file.\n' + err);
                    return;
                }
    
                // Write a reply message and attach the file
                msg.reply(`Retrieved data from '**${ref}**'!`, {
                    files: [path]
                }).then(() => { // Finally remove the file again
                    fs.unlink(path, err => {
                        i++;
                        if (err) console.error('Could not remove file.\n' + err);
                    });
                }).catch((err) => {
                    console.error('Could not find or open file.\n' + err);
                });
            });
        });
    }
}