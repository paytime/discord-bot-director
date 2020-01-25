'use strict';
const Discord = require('discord.js');
const df = require('dateformat');
const iconURL = process.env.ICONURL;
const empty = '\u200b';
const startmsg = (ref, raiderRole) => {
    return `ID: ${ref} - <@&${raiderRole}>`;
};
const autoSignUp = '✅';
const manualSignUp = '#️⃣';
const cancelSignUp = '❎';

const db = require('./db');

/**
 * Restarts all still active raids
 * @param {Discord.Client} bot 
 * @param {*} params 
 */
function restartRaids(bot, params) {
    // Go through each signup channel and check for signup posts
    for (let i = 0; i < params.roles.raiders.list.length; i++) {
        const raidInfo = params.roles.raiders.list[i];

        if (!raidInfo.signups) {
            continue;
        }

        const guild = bot.guilds.get(process.env.SERVERID);
        if (!guild) {
            continue;
        }

        const signUpChannel = guild.channels.get(raidInfo.signups);

        if (!signUpChannel) {
            continue;
        }

        signUpChannel.fetchMessages()
            .then(messages => {
                if (Array.isArray(messages.array())) {
                    messages.forEach(raid => {
                        restartRaid(bot, raid, guild, params);
                    })
                } else {
                    restartRaid(bot, messages, guild, params);
                }
            });
    }
}

/**
 * Restarts a single raid
 * @param {Discord.Client} bot 
 * @param {Discord.Message} raid 
 * @param {Discord.Guild} guild 
 * @param {*} params 
 */
function restartRaid(bot, raid, guild, params) {
    if (raid.author === bot.user && raid.content.startsWith('ID:')) {
        const ref = raid.content.split('-')[0].trim().slice(4);
        db.pull(bot, ref, (entry) => {
            console.info(`Restarting raid '${entry.raid}'`);

            const members = new Discord.Collection();
            for (let i = 0; i < entry.members.length; i++) {
                const member = guild.members.get(entry.members[i].id);
                if (member) {
                    members.set(entry.members[i].id, {
                        id: entry.members[i].id,
                        roles: member.roles,
                        displayName: entry.members[i].displayName
                    });
                }
            }

            //Restart the raid
            startSignUps(raid, members, entry.raiderRole, params, new Date(entry.date), ref);
        });
    }
}

/**
 * Checks if the user has permission with mess with raids and return the user's raider role.
 * @param {Discord.Message} msg 
 * @param {String} str 
 * @param {*} params 
 * @param {Boolean} specialperms
 */
function fetchRaiderRole(msg, str, params, specialperms) {
    const leaderRoleId = params.roles.raiders.leader;
    const assistRoleId = params.roles.raiders.assist;

    if (specialperms) {
        if (!msg.member.hasPermission('ADMINISTRATOR') && !msg.member.roles.has(leaderRoleId) && !msg.member.roles.has(assistRoleId)) {
            throw new Error('You do not have the permission to use this command.');
        }
    }

    // Check if the input is a raider role or emoji, otherwise take user's raider role
    let raiderRole;
    if (str) {
        for (let i = 0; i < params.roles.raiders.list.length; i++) {
            const x = params.roles.raiders.list[i];
            if (x.emoji === str || x.id === str.slice(3, -1)) {
                raiderRole = x.id;
                break;
            }
        }
    } else {
        // Find the user's first raider role
        for (let i = 0; i < params.roles.raiders.list.length; i++) {
            const roleId = params.roles.raiders.list[i].id;

            if (msg.member.roles.has(roleId)) {
                raiderRole = roleId;
                break;
            }
        }

        if (!raiderRole) {
            throw new Error('You are not a member of any raid group.');
        }
    }

    if (!raiderRole) {
        throw new Error('Inavlid raider role.');
    }

    return raiderRole;
}

/**
 * Posts a roster of a raid
 * @param {Discord.Message} msg 
 * @param {Discord.Collection<String, Discord.GuildMember>} members 
 * @param {*} raiderRole 
 * @param {*} params 
 * @param {Date} date 
 */
function roster(msg, members, raiderRole, params, date) {
    // Get the raid's info
    const raidInfo = params.roles.raiders.list.find(x => x.id === raiderRole);

    let days, schedule;
    if (date) {
        days = df(date, 'dd-mm-yyyy');
        schedule = df(date, 'HH:MM');
    } else {
        days = raidInfo.days;
        schedule = raidInfo.schedule;
    }

    // Find the raid's leader and assists
    const raidLeader = msg.guild.members.filter(member => member.roles.has(raiderRole) && member.roles.has(params.roles.raiders.leader)).array();
    const raidAssists = msg.guild.members.filter(member => member.roles.has(raiderRole) && member.roles.has(params.roles.raiders.assist)).array();

    raidAssists.toString = function () {
        return this.join(' ');
    };

    raidLeader.toString = function () {
        return this.join(' ');
    };

    // Create fields for each role/class combo
    const classes = params.roles.classes.list;
    const roles = params.roles.roles.list;

    Array.prototype.toString = function () {
        return this.join('\n');
    }

    const tanks = [];
    const warriors = [];
    const druids = [];
    const rogues = [];
    const shamans = [];
    const warlocks = [];
    const mages = [];
    const priests = [];
    const hunters = [];

    const emoji = function (roleCount) {
        return msg.guild.emojis.find(e => e.name === roles[roleCount].emoji)
    };

    const sort = function (a, b) {
        if (a.displayName > b.displayName) return 1;
        else if (b.displayName > a.displayName) return -1;
        return 0;
    }

    members.filter(m => m.roles.has(roles[0].id)).sort(sort).forEach(m => {
        tanks.push(`${emoji(0)} ${m.displayName}`);
    });

    members.filter(m => m.roles.has(classes[7].id)).sort(sort).forEach(m => {
        if (m.roles.has(roles[0].id)) return;

        warriors.push(`${emoji(2)} ${m.displayName}`);
    });

    members.filter(m => m.roles.has(classes[0].id)).sort(sort).forEach(m => {
        if (m.roles.has(roles[0].id)) return;

        let role = 2;

        if (m.roles.has(roles[1].id)) role = 1;

        druids.push(`${emoji(role)} ${m.displayName}`);
    });

    members.filter(m => m.roles.has(classes[4].id)).sort(sort).forEach(m => {
        rogues.push(`${emoji(2)} ${m.displayName}`);
    });

    members.filter(m => m.roles.has(classes[5].id)).sort(sort).forEach(m => {
        let role = 1;

        if (m.roles.has(roles[2].id)) role = 2;

        shamans.push(`${emoji(role)} ${m.displayName}`);
    });

    members.filter(m => m.roles.has(classes[6].id)).sort(sort).forEach(m => {
        warlocks.push(`${emoji(2)} ${m.displayName}`);
    });

    members.filter(m => m.roles.has(classes[2].id)).sort(sort).forEach(m => {
        mages.push(`${emoji(2)} ${m.displayName}`);
    });

    members.filter(m => m.roles.has(classes[3].id)).sort(sort).forEach(m => {
        let role = 1;

        if (m.roles.has(roles[2].id)) role = 2;

        priests.push(`${emoji(role)} ${m.displayName}`);
    });

    members.filter(m => m.roles.has(classes[1].id)).sort(sort).forEach(m => {
        hunters.push(`${emoji(2)} ${m.displayName}`);
    });

    const fields = [
        {
            name: empty,
            value: `**👪 ${members.size}**`,
            inline: true
        },
        {
            name: empty,
            value: `**📅 ${days}**`,
            inline: true
        },
        {
            name: empty,
            value: `**🕒 ${schedule}**`,
            inline: true
        },
        {
            name: empty,
            value: `**${emoji(0)} Tanks - ${tanks.length} ${emoji(0)}\n${empty}**`,
            inline: true
        },
        {
            name: empty,
            value: `**${emoji(2)} DPS - ${members.filter(m => m.roles.has(roles[2].id)).size} ${emoji(2)}\n${empty}**`,
            inline: true
        },
        {
            name: empty,
            value: `**${emoji(1)} Healers - ${members.filter(m => m.roles.has(roles[1].id)).size} ${emoji(1)}\n${empty}**`,
            inline: true
        }
    ];

    if (tanks.length > 0) fields.push({
        name: `**${msg.guild.emojis.find(e => e.name === 'prot')} Tanks (${tanks.length})**`,
        value: tanks.toString(),
        inline: true
    });

    if (druids.length > 0) fields.push({
        name: `**${msg.guild.emojis.find(e => e.name === classes[0].emoji)} Druids (${druids.length})**`,
        value: druids.toString(),
        inline: true
    });

    if (hunters.length > 0) fields.push({
        name: `**${msg.guild.emojis.find(e => e.name === classes[1].emoji)} Hunters (${hunters.length})**`,
        value: hunters.toString(),
        inline: true
    });

    if (mages.length > 0) fields.push({
        name: `**${msg.guild.emojis.find(e => e.name === classes[2].emoji)} Mages (${mages.length})**`,
        value: mages.toString(),
        inline: true
    });

    if (priests.length > 0) fields.push({
        name: `**${msg.guild.emojis.find(e => e.name === classes[3].emoji)} Priests (${priests.length})**`,
        value: priests.toString(),
        inline: true
    });

    if (rogues.length > 0) fields.push({
        name: `**${msg.guild.emojis.find(e => e.name === classes[4].emoji)} Rogues (${rogues.length})**`,
        value: rogues.toString(),
        inline: true
    });

    if (shamans.length > 0) fields.push({
        name: `**${msg.guild.emojis.find(e => e.name === classes[5].emoji)} Shamans (${shamans.length})**`,
        value: shamans.toString(),
        inline: true
    });

    if (warlocks.length > 0) fields.push({
        name: `**${msg.guild.emojis.find(e => e.name === classes[6].emoji)} Warlocks (${warlocks.length})**`,
        value: warlocks.toString(),
        inline: true
    });

    if (warriors.length > 0) fields.push({
        name: `**${msg.guild.emojis.find(e => e.name === classes[7].emoji)} Warriors (${warriors.length})**`,
        value: warriors.toString(),
        inline: true
    });

    return {
        timestamp: new Date(),
        title: `${raidInfo.emoji} Raid ${raidInfo.name}`,
        description: `**Leader:** ${raidLeader}\n**Assistants:** ${raidAssists}`,
        color: 16715264,
        fields: fields,
        footer: {
            icon_url: iconURL,
            text: `© <${msg.guild.name}>`
        }
    };
}

/**
 * Posts a roster of a raid and adds signup info to it
 * @param {Discord.Message} msg 
 * @param {Discord.Collection<String, Discord.GuildMember>} members 
 * @param {*} raiderRole 
 * @param {*} params 
 * @param {*} date 
 */
function signUpRoster(msg, members, raiderRole, params, date) {
    // Fix sign up order
    members.forEach(m => {
        m.displayName = m.displayName.split(' ')[0] + ' `' + (members.array().indexOf(m) + 1) + '`';
    });

    // Creates a raid window
    const content = roster(msg, members, raiderRole, params, date);

    // Append the info about the sign up emojis
    content.fields.push({
        name: empty,
        value: `**${autoSignUp} - AUTO SIGN UP\n\n${manualSignUp} - MANUAL SIGN UP (For Alts)\n\n${cancelSignUp} - ABSENT**`,
        inline: false
    });

    return content;
}

/**
 * Starts the sign up process of the raid
 * @param {Discord.Message} raid 
 * @param {Discord.Collection<String, Discord.GuildMember>} members 
 * @param {String} raiderRole 
 * @param {*} params 
 * @param {Date} date 
 * @param {String} ref 
 */
function startSignUps(raid, members, raiderRole, params, date, ref) {
    const curDate = new Date();

    if (curDate.getTime() > date.getTime()) { // If the event ran out remove the message
        raid.delete();
        return;
    }

    // Only members of this raid group will get considered
    const autoFilter = (react, user) => react.emoji.name === autoSignUp
        && raid.guild.members.filter(member => member.roles.has(raiderRole)).has(user.id);
    const manualFilter = (react, user) => react.emoji.name === manualSignUp
        && raid.guild.members.filter(member => member.roles.has(raiderRole)).has(user.id);
    const cancelFilter = (react, user) => react.emoji.name === cancelSignUp
        && raid.guild.members.filter(member => member.roles.has(raiderRole)).has(user.id);

    const autoCollector = raid.createReactionCollector(autoFilter);
    const manualCollector = raid.createReactionCollector(manualFilter);
    const absentCollector = raid.createReactionCollector(cancelFilter);

    // Listens to all the collected emojis. Users aren't allowed to react to all options, so the previous one will get removed.
    autoCollector.on('collect', react => {
        if ((new Date()).getTime() > date.getTime()) { // Ignore and stop if date passed.
            autoCollector.stop();
            return; 
        } 

        const user = react.users.last();

        if (manualCollector.collected.first() && manualCollector.collected.first().users.has(user.id)) {
            manualCollector.collected.first().remove(user.id);
        }

        if (absentCollector.collected.first() && absentCollector.collected.first().users.has(user.id)) {
            absentCollector.collected.first().remove(user.id);
        }

        // Just update roster
        const m = raid.guild.members.get(user.id);
        members.delete(user.id);
        members.set(user.id, {
            id: m.id,
            roles: m.roles,
            displayName: m.displayName + ` \`${members.size + 1}\``
        });
        const editedContent = signUpRoster(raid, members, raiderRole, params, date);
        raid.edit(startmsg(ref, raiderRole), { embed: editedContent });

        // Store the data
        const entry = JSON.stringify({
            raid: raid.id,
            channel: raid.channel.id,
            guild: raid.guild.id,
            raiderRole: raiderRole,
            date: date,
            members: members.array()
        });
        db.push(raid.client, ref, entry);
    });

    manualCollector.on('collect', react => {
        if ((new Date()).getTime() > date.getTime()) { // Ignore and stop if date passed.
            manualCollector.stop();
            return; 
        } 

        const user = react.users.last();

        if (absentCollector.collected.first() && absentCollector.collected.first().users.has(user.id)) {
            absentCollector.collected.first().remove(user.id);
        }

        if (autoCollector.collected.first() && autoCollector.collected.first().users.has(user.id)) {
            autoCollector.collected.first().remove(user.id);
        }

        // If the user has chosen the manual sign up, he/she will receive a DM asking what his name, class and role is. This will be then added to the raid list
        user.createDM().then(dm => {
            dm.send('**You have chosen to manually sign up for the raid.** Please tell me your ingame name, your class and your role (Tank or Healer) if you are not DPS.\nExample: `Paytime Druid Healer` or `Poortime Mage`');

            const filter = m => m.content.trim().length > 5 && m.content.trim().length < 50 && (m.content.trim().split(' ').length === 2 || m.content.trim().split(' ').length === 3);
            const messageCollector = dm.createMessageCollector(filter, { time: 120000 });

            messageCollector.on('collect', m => {
                let isOk = true;
                const args = m.content.trim().toLowerCase().split(' ');

                // Check the role
                let role;
                if (args.length === 3) {
                    switch (args[2]) {
                        case 'tank':
                        case 'healer':
                        case 'dps':
                            role = raid.guild.roles.find(r => r.name.toLowerCase() === args[2]);
                            break;
                        default:
                            isOk = false;
                            break;
                    }
                } else {
                    role = raid.guild.roles.find(r => r.name.toLowerCase() === 'dps');
                }

                // Check the class
                let classrole;
                switch (args[1]) {
                    case 'mage':
                    case 'druid':
                    case 'hunter':
                    case 'warrior':
                    case 'warlock':
                    case 'priest':
                    case 'shaman':
                    case 'rogue':
                        classrole = raid.guild.roles.find(r => r.name.toLowerCase() === args[1]);
                        break;
                    default:
                        isOk = false;
                        break;
                }

                // Check if the player's name is not too long or too short
                if (args[0].length > 12 && args[0].length < 2) {
                    isOk = false;
                }

                if (!classrole || !role) {
                    isOk = false;
                }

                if (isOk) {
                    const roles = new Discord.Collection();
                    roles.set(classrole.id, classrole);
                    roles.set(role.id, role);
                    members.delete(user.id);
                    members.set(user.id, {
                        id: user.id,
                        roles: roles,
                        displayName: args[0].replace(/^\w/, c => c.toUpperCase()) + ` \`${members.size + 1}\``
                    });
                    const editedContent = signUpRoster(raid, members, raiderRole, params, date);
                    raid.edit(startmsg(ref, raiderRole), { embed: editedContent });

                    messageCollector.stop();
                    dm.send('👌');

                    // Store the data
                    const entry = JSON.stringify({
                        raid: raid.id,
                        channel: raid.channel.id,
                        guild: raid.guild.id,
                        raiderRole: raiderRole,
                        date: date,
                        members: members.array()
                    });
                    db.push(raid.client, ref, entry);
                } else {
                    dm.send('The input is invalid. Try again!');
                }
            });
        });
    });

    absentCollector.on('collect', react => {
        if ((new Date()).getTime() > date.getTime()) { // Ignore and stop if date passed.
            absentCollector.stop();
            return; 
        } 

        const user = react.users.last();

        if (manualCollector.collected.first() && manualCollector.collected.first().users.has(user.id)) {
            manualCollector.collected.first().remove(user.id);
        }

        if (autoCollector.collected.first() && autoCollector.collected.first().users.has(user.id)) {
            autoCollector.collected.first().remove(user.id);
        }

        // Remove user from roster and edit content
        const res = members.delete(user.id);
        if (res) {
            const editedContent = signUpRoster(raid, members, raiderRole, params, date);
            raid.edit(startmsg(ref, raiderRole), { embed: editedContent });

            // Store the data
            const entry = JSON.stringify({
                raid: raid.id,
                channel: raid.channel.id,
                guild: raid.guild.id,
                raiderRole: raiderRole,
                date: date,
                members: members.array()
            });
            db.push(raid.client, ref, entry);
        }
    });
}

/**
 * Get the date and time from a string of the format dd-mm-yyyy/HH:MM
 * @param {*} str
 */
function getdate(str) {
    const formaterr = "Invalid Date. The correct format is: `dd-mm-yyyy/HH:MM`. Example: `20-05-2020/19:30`";
    let split = str.split('/');

    if (!split || split.length !== 2) {
        throw new Error(formaterr);
    }

    let dateString = split[0].split('-');
    let timeString = split[1].split(':');

    if (!dateString || !timeString || dateString.length !== 3 || timeString.length !== 2) {
        throw new Error(formaterr);
    }

    let date;

    try {
        date = new Date(parseInt(dateString[2]), parseInt(dateString[1] - 1), parseInt(dateString[0]), parseInt(timeString[0]), parseInt(timeString[1]));
    } catch {
        throw new Error(formaterr);
    }

    if (!date) {
        throw new Error(formaterr);
    }

    return date;
}

/**
 * Creates the raid event
 * @param {Discord.Message} msg 
 * @param {String} raiderRole 
 * @param {*} params 
 * @param {Date} date 
 */
function createRaidEvent(msg, raiderRole, params, date) {
    // First check if the raider role has a channel assigned and if all other parameters are still valid
    const param = params.roles.raiders.list.find(x => x.id === raiderRole);

    if (!param || !param.signups) {
        throw new Error('Invalid configuration.');
    }

    const signUpChannel = msg.guild.channels.get(param.signups);

    if (!signUpChannel) {
        throw new Error('Cannot find Sign-Up channel for this raid group.');
    }

    const content = signUpRoster(msg, new Discord.Collection(), raiderRole, params, date);

    signUpChannel.send('Working...')
        .then((raid) => {
            // prepare entry
            const entry = JSON.stringify({
                raid: raid.id,
                channel: raid.channel.id,
                guild: raid.guild.id,
                raiderRole: raiderRole,
                date: date,
                members: []
            });

            // Store data in db and then start the raid
            db.commit(msg.client, entry, (ref) => {
                raid.edit(startmsg(ref, raiderRole), { embed: content })
                    .then(raid.react(autoSignUp)
                        .then(raid.react(manualSignUp)
                            .then(raid.react(cancelSignUp)
                                .then(startSignUps(raid, new Discord.Collection(), raiderRole, params, date, ref)))));
            });
        });
}

module.exports = {
    empty: empty,
    autoSignUp: autoSignUp,
    manualSignUp: manualSignUp,
    cancelSignUp: cancelSignUp,
    startmsg: startmsg,
    raiderRole: fetchRaiderRole,
    iconURL: iconURL,
    roster: roster,
    signUpRoster: signUpRoster,
    startSignUps: startSignUps,
    restartRaids: restartRaids,
    getdate: getdate,
    createRaidEvent: createRaidEvent
};