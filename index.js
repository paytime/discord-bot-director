'use strict';
process.title = 'discord-bot-director';

require('dotenv').config(); // Loads the '.env' config file
const fs = require('fs');
const Discord = require('discord.js');
const bot = new Discord.Client();
bot.commands = new Discord.Collection();

const botCommands = require('./commands');

const file = './list.json';
let listOfAssigns = [];

/**
 * Retrieve all commands
 */
Object.keys(botCommands).map(key => {
    bot.commands.set(botCommands[key].name, botCommands[key]);
});

/**
 * Read the list file and launch the bot
 * @param {*} isInit 
 */
function readListFile(isInit) {
    fs.readFile(file, {encoding: 'utf-8', flag: 'a+'}, (err, data) => {
        if (err) {
            console.error("Failed to read file list.json: " + err)
            return;
        }
    
        try {
            if (data) {
                listOfAssigns = JSON.parse(data);
            } else {
                listOfAssigns = [];
            }
        } catch (err) {
            console.error("Failed to parse list-file: " + err)
            return;
        }
    
        if (isInit) bot.login(process.env.TOKEN);
    });
}

/**
 * Calls when the bot has started
 */
bot.on('ready', () => {
    console.info(`Logged in as ${bot.user.tag}`);
});

/**
 * Calls when the bot reads a message
 */
bot.on('message', msg => {
    /**
     * Cancel if 'msg' is:
     * * invalid
     * * from another bot
     * * doesn't mention this bot
     */
    if (msg.author.bot || msg.member === null || !msg.content.startsWith(process.env.PREFIX)) return;

    // The message content without the mention
    const args = msg.content.substr(process.env.PREFIX.length).trim().toLowerCase().split(/ +/);

    const command = args.shift().toLowerCase();

    console.info(`Called command: ${command}`);

    if (!bot.commands.has(command)) return;

    try {
        const res = bot.commands.get(command).execute(msg, args, listOfAssigns);

        if (res) {
            readListFile(false);
        }
    } catch (error) {
        console.error(error);
    }
});

// The program starts here
readListFile(true);