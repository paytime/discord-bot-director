const Discord = require('discord.js');

const iconUrl = process.env.ICONURL;
const serverId = process.env.SERVERID;
const channelId = process.env.CHANNELID;
const invchannelId = process.env.INVCHANNELID;

/**
 * Gets the Discord-URL for a server link
 * @param {*} id 
 */
function getChannelLink(id) {
    return `http://discordapp.com/channels/${serverId}/${id}`;
}

/**
 * Clears the specified channel of its content, sets the member's count as the channel's title and posts the stats embed
 * @param {Discord.Client} bot 
 * @param {*} roles 
 * @param {Discord.Message} statsmsg 
 */
function update(bot, roles, statsmsg) {
    let guild = bot.guilds.get(serverId);
    let channel = guild.channels.get(channelId);
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

        const text = `${emoji} <@&${c.id}> [**(${count})**](${getChannelLink(c.channel)})\n\n`;

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
        const emoji = guild.emojis.find(e => e.name === c.emoji);

        rolesFields += `${emoji} <@&${c.id}> **(${count})**    `;
    }

    let raidersFields = `**[Raiders](${getChannelLink(roles.raiders.select)})**\n\n`;

    // Get all raider roles
    for (let i = 0; i < roles.raiders.list.length; i++) {
        const c = roles.raiders.list[i];
        const count = Array.from(guild.members.filter(m => !m.user.bot && m.roles.has(c.id))).length;

        const text = `${c.emoji} <@&${c.id}> [**(${count})**](${getChannelLink(c.channel)})    `;

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

        const text = `${emoji} <@&${c.id}> **(${count})**\n\n`;

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
        statsmsg(sent);
    });
}

/**
 * Creates and sends an invite link to the user.
 * @param {Discord.MessageReaction} msgReact 
 * @param {Discord.User} user 
 * @param {Discord.Client} bot 
 */
function sendInviteLink(msgReact, user, bot) {
    msgReact.message.clearReactions().then(() => {
        if (!user || user.bot || !user.id) return;
        let guild = bot.guilds.get(serverId);
        if (!guild) return;
        let invchannel = guild.channels.get(invchannelId);
        if(!invchannel) return;

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
}

module.exports = {
    update: update,
    sendInviteLink: sendInviteLink
}