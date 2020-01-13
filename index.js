'use strict';
process.title = 'discord-bot-director';

require('dotenv').config(); // Loads the '.env' config file

const Discord = require('discord.js');
const bot = new Discord.Client();
bot.commands = new Discord.Collection();

const botCommands = require('./commands');

const prefix = [
    `<@${process.env.BOTID}>`,
    `<@!${process.env.BOTID}>`
];

const helpers = require('./modules/helpers'); // Loads some helper functions
const stats = require('./modules/statistics.js'); // Loads the statistics logic
const raids = require('./modules/raids.js'); // Loads raids logic

const params = {
    assigns: [],
    roles: {},
    statsmsg: null
};

/**
 * Calls when the bot has started
 */
bot.on('ready', () => {
    console.info(`Logged in as ${bot.user.tag}`);

    try {
        // Check if the bot is fully setup
        helpers.checkbot(bot);

        console.info('Reading roles-assignment list...');
        helpers.fetchassigns((res) => {
            params.assigns = res;

            console.info('Loading roles...');
            helpers.fetchroles((res) => {
                params.roles = res;
                updateStats();

                // Checks active raids and restarts them
                console.info('Checking if there are any active raids...');
                raids.restartRaids(bot, params);

                console.info('SUCCESS');
            });
        });
    } catch (err) {
        console.error(err);
        reconnect(false);
        return;
    }
});

function updateStats() {
    stats.update(bot, params.roles, (res) => {
        params.statsmsg = res;
    });
}

bot.on('guildMemberAdd', updateStats);
bot.on('guildMemberRemove', updateStats);
bot.on('guildMemberUpdate', updateStats);

/**
 * Calls when a user reacts on a bot's message
 */
bot.on('messageReactionAdd', (msgReact, user) => {
    if (msgReact.me) return;

    // Whenever a reaction is added to the stats message, the reaction will be removed and an invite link will be generated.
    if (msgReact.message.id === params.statsmsg.id) {
        stats.sendInviteLink(msgReact, user, bot);
    }
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
    if (msg.author.bot || msg.member === null) return;

    let len = 0;
    if (msg.content.startsWith(prefix[0])) {
        len = prefix[0].length;
    } else if (msg.content.startsWith(prefix[1])) {
        len = prefix[1].length;
    } else {
        return;
    }

    // The message content without the mention
    const args = msg.content.substr(len).trim().toLowerCase().split(/ +/);

    let command = args.shift().toLowerCase();

    console.log(`${msg.author.username} has called: ${args}`);

    console.info(`Called command: ${command}`);

    const isHelp = command.startsWith('?'); // user wants to call the help/description of the command

    if (isHelp) {
        command = command.substr(1); // Remove ? from the command
    }

    if (!bot.commands.has(command)) return;

    try {
        if (isHelp) {
            const desc = bot.commands.get(command).description;

            if (!desc) {
                throw new Error(`Command ${command} has no description/help.`);
            }

            msg.reply(desc);
        } else {
            bot.commands.get(command).execute(msg, args, params); // Execute the commands with args.
        }
    } catch (error) {
        console.error(error);
        msg.reply('**ERROR:** ' + error.message);
    }
});

/**
 * Retrieve all commands
 */
Object.keys(botCommands).map(key => {
    bot.commands.set(botCommands[key].name, botCommands[key]);
});

/**
 * Destroys the client and attempts to relaunch
 * @param {*} isFirstLogin 
 */
function reconnect(isFirstLogin) {
    if (!isFirstLogin) {
        console.info('Reconnecting...');
    }

    try {
        bot.destroy();
        bot.login(process.env.TOKEN);
    } catch (err) {
        console.error('Cannot login BOT. Check your Internet connection.');
        reconnect(false);
        return;
    }
}

// The program starts here
reconnect(true);