'use strict';
process.title = 'discord-bot-director';

require('dotenv').config(); // Loads the '.env' config file
const fs = require('fs');
const Discord = require('discord.js');
const bot = new Discord.Client();
bot.commands = new Discord.Collection();

const botCommands = require('./commands');

const prefix = [
    `<@${process.env.BOTID}>`,
    `<@!${process.env.BOTID}>`
]

const file = './config/assignments.json';
let listOfAssigns = [];

const serverId = process.env.SERVERID;
const channelId = process.env.CHANNELID;
const invchannelId = process.env.INVCHANNELID;
const botId = process.env.BOTID;
const iconUrl = process.env.ICONURL;

let guild;
let channel;
let invchannel;
let roles = {};

let messageId;

/**
 * Calls when the bot has started
 */
bot.on('ready', () => {
    console.info(`Logged in as ${bot.user.tag}`);

    console.info('Reading roles-assignment list...');
    try {
        readAssignmentsFile();
    } catch (err) {
        console.error(err);
        reconnect(false);
        return;
    }

    console.info('Trying to access server...');

    guild = bot.guilds.get(serverId);

    if (!guild) {
        console.error('Could not find specified guild!');
        reconnect(false);
        return;
    }

    console.info('Trying to find statistics channel...');

    channel = guild.channels.get(channelId);

    if (!channel) {
        console.error('Could not find statistics channel!');
        reconnect(false);
        return;
    }

    console.info('Trying to find the main/invite channel...');

    invchannel = guild.channels.get(invchannelId);

    if (!channel) {
        console.error('Could not find main/invite channel!');
        reconnect(false);
        return;
    }

    console.info('Checking if bot has Administrator privileges...');

    if (!guild.members.get(botId) || !guild.members.get(botId).hasPermission('ADMINISTRATOR')) {
        console.error('Bot is not an admin!');
        reconnect(false);
        return;
    }

    console.info('Loading roles...');

    try {
        readRolesFile();
    } catch (err) {
        console.error(err);
        reconnect(false);
        return;
    }
});

bot.on('guildMemberAdd', setupChannel);
bot.on('guildMemberRemove', setupChannel);
bot.on('guildMemberUpdate', setupChannel);

/**
 * Whenever a reaction is added to the stats message, the reaction will be removed and an invite link will be generated
 */
bot.on('messageReactionAdd', (msgReact, user) => {
    if (!messageId) return;
    if (msgReact.message.id !== messageId) return;

    msgReact.message.clearReactions().then(() => {
        if (!user || user.bot || !user.id) return;
        const gm = guild.members.get(user.id);
        if (!gm) return;

        const reason = `Invite created by ${user.username}#${user.discriminator}`;

        invchannel.createInvite({
            temporary: true,
            maxUses: 2,
            unique: true,
            reason: reason
        }).then(invlink => {
            console.log(`${new Date()}: ${reason} ; Code: ${invlink.code}`);

            user.send(`https://discord.gg/${invlink.code}`);
        });
    });
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

    // Delete the message to avoid spam and tagging too many players
    msg.delete().catch(console.error);

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
            const res = bot.commands.get(command).execute(msg, args, listOfAssigns);

            if (res) {
                readAssignmentsFile();
            }
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
 * Read the list file and launch the bot
 */
function readAssignmentsFile() {
    fs.readFile(file, { encoding: 'utf8', flag: 'a+' }, (err, data) => {
        if (err) {
            throw new Error("Failed to read file list.json: " + err);
        }

        try {
            if (data) {
                listOfAssigns = JSON.parse(data);
            } else {
                listOfAssigns = [];
            }
        } catch (err) {
            throw new Error("Failed to parse list-file: " + err);
        }
    });
}

/**
 * Reads the specified roles file
 */
function readRolesFile() {
    fs.readFile('./roles.json', (err, data) => {
        if (err) { // File doesn't exist.
            throw new Error('Roles file does not exist. Check out the \'roles.example.json\' file!');
        }

        try {
            roles = JSON.parse(data);
        } catch (err) {
            throw new Error("Failed to parse list-file: " + err)
        }

        console.info('SUCCESS!');

        try {
            setupChannel();
        } catch (error) {
            throw new Error("An error occured while posting the stats message: " + error);
        }
    });
}

/**
 * Clears the specified channel of its content, sets the member's count as the channel's title and posts the stats embed
 */
function setupChannel() {
    let date = new Date();

    // First of all, delete all messages in the channel
    channel.bulkDelete(100);

    const membersCount = Array.from(guild.members.filter(m => !m.user.bot)).length; // Members count excluding bots.

    // Get all class roles
    let classFields = `**[Classes](${getChannelLink(roles.classes.select)})**\n\n`;
    let classFields2 = "\u200b\n\n"; // Workaround for the field 1024 chars limit

    for (let i = 0; i < roles.classes.list.length; i++) {
        const c = roles.classes.list[i];
        const count = Array.from(guild.members.filter(m => !m.user.bot && m.roles.has(c.id))).length;
        const emoji = guild.emojis.find(e => e.name === c.emoji);

        const text = `[${emoji} <@&${c.id}> **(${count})**](${getChannelLink(c.channel)})\n\n`;

        if (i > 3) {
            classFields2 += text;
        } else {
            classFields += text;
        }
    }

    let rolesFields = `**[Roles](${getChannelLink(roles.roles.select)})**\n\n`;

    // Get all ingame roles
    for (let i = 0; i < roles.roles.list.length; i++) {
        const c = roles.roles.list[i];
        const count = Array.from(guild.members.filter(m => !m.user.bot && m.roles.has(c.id))).length;

        rolesFields += `[<@&${c.id}> **(${count})**](${getChannelLink(c.channel)})    `;
    }

    let raidersFields = `**[Raiders](${getChannelLink(roles.raiders.select)})**\n\n`;

    // Get all raider roles
    for (let i = 0; i < roles.raiders.list.length; i++) {
        const c = roles.raiders.list[i];
        const count = Array.from(guild.members.filter(m => !m.user.bot && m.roles.has(c.id))).length;

        const text = `[${c.emoji} <@&${c.id}> **(${count})**](${getChannelLink(c.channel)})    `;

        raidersFields += text;

        if (i === 1) raidersFields += '\n\n';
    }

    let profFields = `**[Professions](${getChannelLink(roles.professions.select)})**\n\n`;
    let profFields2 = "\u200b\n\n"; // Workaround for the field 1024 chars limit

    // Get all profession roles
    for (let i = 0; i < roles.professions.list.length; i++) {
        const c = roles.professions.list[i];
        const count = Array.from(guild.members.filter(m => !m.user.bot && m.roles.has(c.id))).length;
        const emoji = guild.emojis.find(e => e.name === c.emoji);

        const text = `[${emoji} <@&${c.id}> **(${count})**](${getChannelLink(c.channel)})\n\n`;

        if (i > 3) {
            profFields2 += text;
        } else {
            profFields += text;
        }
    }

    const content = {
        embed: {
            timestamp: date,
            title: `<${guild.name}> SERVER STATISTICS`,
            description: `Guild Members: **${membersCount}**`,
            color: 8462170,
            thumbnail: {
                url: iconUrl
            },
            fields: [
                {
                    name: '\u200b',
                    value: classFields,
                    inline: true
                },
                {
                    name: '\u200b',
                    value: classFields2,
                    inline: true
                },
                {
                    name: '\u200b',
                    value: rolesFields,
                    inline: false
                },
                {
                    name: '\u200b',
                    value: raidersFields,
                    inline: false
                },
                {
                    name: '\u200b',
                    value: profFields,
                    inline: true
                },
                {
                    name: '\u200b',
                    value: profFields2,
                    inline: true
                }
            ],
            footer: {
                icon_url: iconUrl,
                text: `© <${guild.name}>`
            }
        }
    };

    channel.send(content).then(sent => {
        console.info(`Stats updated at: ${date}`);
        messageId = sent.id;
    });
}

/**
 * Gets the URL for a server link
 * @param {*} id 
 */
function getChannelLink(id) {
    return `http://discordapp.com/channels/${guild.id}/${id}`;
}

/**
 * Destroys the client and attempts to relaunch
 * @param {*} isFirstLogin 
 */
function reconnect(isFirstLogin) {
    if (!isFirstLogin) {
        console.info('Reconnecting...');
    }

    bot.destroy();
    bot.login(process.env.TOKEN);
}

// The program starts here
reconnect(true);