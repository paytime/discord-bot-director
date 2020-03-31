'use strict';
const Discord = require('discord.js');
const df = require('dateformat');
const iconURL = process.env.ICONURL;
const empty = '\u200b';
const startmsg = (ref, raiderRole) => {
    return `ID: ${ref} - <@&${raiderRole}>`;
};

const autoSignUp = '✅';
const tentativeSignUp = '✳️';
const manualSignUp = '#️⃣';
const cancelSignUp = '❎';
const adminSignUp = '⚙️';

const db = require('./db');

const archivedRaid = 'Archived Raid';
const defaultInfoText = '*No special information given.*';
const defaultAbsentText = '*No Absentees!*';

const status = {
    ACTIVE: 0,
    TENTATIVE: 1,
    ABSENT: 2
}

let dmChats = [];

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
        db.pull(bot, ref, entry => {
            console.info(`Restarting raid '${ref}'`);

            const members = new Discord.Collection();
            for (let i = 0; i < entry.members.length; i++) {
                const em = entry.members[i];
                const member = guild.members.get(em.id);
                if (member) {
                    members.set(em.id, {
                        id: em.id,
                        displayName: em.displayName,
                        roles: em.roles,
                        status: em.status ? em.status : status.ACTIVE
                    });
                }
            }

            //Restart the raid
            startSignUps(raid, members, entry.raiderRole, params, new Date(entry.date), entry.info, ref);
        });
    }
}

/**
 * Checks if the user has permission with mess with raids and return the user's raider role.
 * @param {Discord.Message} msg 
 * @param {String} str 
 * @param {*} params 
 * @param {Boolean} needsPerm 
 */
function fetchRaiderRole(msg, str, params, needsPerm) {
    // Check if the input is a raider role or emoji, otherwise take user's raider role
    let raider;
    if (str) {
        for (let i = 0; i < params.roles.raiders.list.length; i++) {
            const x = params.roles.raiders.list[i];
            if (x.emoji === str || x.id === str.slice(3, -1)) {
                raider = x;
                break;
            }
        }
    } else {
        // Find the user's first raider role
        for (let i = 0; i < params.roles.raiders.list.length; i++) {
            const role = params.roles.raiders.list[i];

            if (msg.member.roles.has(role.id)) {
                raider = role;
                break;
            }
        }

        if (!raider) {
            throw new Error('You are not a member of any raid group.');
        }
    }

    if (!raider) {
        throw new Error('Inavlid raider role.');
    }

    if (needsPerm && !msg.member.hasPermission('ADMINISTRATOR') && !msg.member.roles.has(raider.staff)) {
        throw new Error('You do not have the permission to use this command.');
    }

    return raider.id;
}

/**
 * Posts a roster of a raid
 * @param {Discord.Message} msg 
 * @param {Discord.Collection<String, *>} members 
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
    const staffRole = params.roles.raiders.list.find(x => x.id === raiderRole).staff;
    const raidLeader = msg.guild.members.filter(member => member.roles.has(raiderRole) && member.roles.has(staffRole) && member.roles.has(params.roles.raiders.leader)).array();
    const raidAssists = msg.guild.members.filter(member => member.roles.has(raiderRole) && member.roles.has(staffRole) && member.roles.has(params.roles.raiders.assist)).array();

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

    members.filter(m => m.roles.includes(roles[0].id)).sort(sort).forEach(m => {
        tanks.push(`${emoji(0)} ${m.displayName}`);
    });

    members.filter(m => m.roles.includes(classes[7].id)).sort(sort).forEach(m => {
        if (m.roles.includes(roles[0].id)) return;

        warriors.push(`${emoji(2)} ${m.displayName}`);
    });

    members.filter(m => m.roles.includes(classes[0].id)).sort(sort).forEach(m => {
        if (m.roles.includes(roles[0].id)) return;

        let role = 2;

        if (m.roles.includes(roles[1].id)) role = 1;

        druids.push(`${emoji(role)} ${m.displayName}`);
    });

    members.filter(m => m.roles.includes(classes[4].id)).sort(sort).forEach(m => {
        rogues.push(`${emoji(2)} ${m.displayName}`);
    });

    members.filter(m => m.roles.includes(classes[5].id)).sort(sort).forEach(m => {
        let role = 1;

        if (m.roles.includes(roles[2].id)) role = 2;

        shamans.push(`${emoji(role)} ${m.displayName}`);
    });

    members.filter(m => m.roles.includes(classes[6].id)).sort(sort).forEach(m => {
        warlocks.push(`${emoji(2)} ${m.displayName}`);
    });

    members.filter(m => m.roles.includes(classes[2].id)).sort(sort).forEach(m => {
        mages.push(`${emoji(2)} ${m.displayName}`);
    });

    members.filter(m => m.roles.includes(classes[3].id)).sort(sort).forEach(m => {
        let role = 1;

        if (m.roles.includes(roles[2].id)) role = 2;

        priests.push(`${emoji(role)} ${m.displayName}`);
    });

    members.filter(m => m.roles.includes(classes[1].id)).sort(sort).forEach(m => {
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
            value: `**${emoji(2)} DPS - ${members.filter(m => m.roles.includes(roles[2].id)).size} ${emoji(2)}\n${empty}**`,
            inline: true
        },
        {
            name: empty,
            value: `**${emoji(1)} Healers - ${members.filter(m => m.roles.includes(roles[1].id)).size} ${emoji(1)}\n${empty}**`,
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
 * @param {Discord.Collection<String, *>} members 
 * @param {*} raiderRole 
 * @param {*} params 
 * @param {*} date 
 * @param {String} info 
 */
function signUpRoster(msg, members, raiderRole, params, date, info) {
    // Set sign up order
    let i = 0;
    members.filter(m => m.status === status.ACTIVE).forEach(m => {
        if (!m || !m.id || !m.displayName) {
            members.delete(m.id);
        } else {
            i++;
            m.displayName = m.displayName.split(' `')[0] + ' `' + i + '`';
        }
    });

    // Creates a raid window
    const content = roster(msg, members.filter(m => m.status !== status.ABSENT), raiderRole, params, date);

    // Append the info about the sign up emojis
    content.fields.push({
        name: '**💡 Info**',
        value: info + "\n\n",
        inline: false
    });

    // Append a list of absentees
    const absentees = [];

    members.filter(m => m.status === status.ABSENT).forEach(m => {
        absentees.push(m.displayName);
    });

    content.fields.push({
        name: '**💤 Absentees**',
        value: absentees.length > 0 ? absentees.join(', ') : defaultAbsentText,
        inline: false
    });

    // Add the control buttons
    content.fields.push({
        name: empty,
        value: `**${autoSignUp} - AUTO SIGN UP\n\n${manualSignUp} - MANUAL SIGN UP (For Alts)\n\n${adminSignUp} - OPTIONS (Staff only)**`,
        inline: true
    });

    content.fields.push({
        name: empty,
        value: `**${tentativeSignUp} - TENTATIVE SIGN UP\n\n${cancelSignUp} - ABSENT**`,
        inline: true
    });

    return content;
}

/**
 * Archives the raid
 * @param {Discord.Message} raid 
 * @param {*} autoCollector 
 * @param {*} tentativeFilter
 * @param {*} absentCollector 
 * @param {*} manualCollector 
 * @param {*} adminCollector 
 */
function archiveRaid(raid, autoCollector, tentativeFilter, absentCollector, manualCollector, adminCollector) {
    try {
        raid.edit(`${archivedRaid} - ${raid.content}`).catch(() => { });
        autoCollector.stop();
        tentativeFilter.stop();
        absentCollector.stop();
        manualCollector.stop();
        adminCollector.stop();
        raid.clearReactions().catch(() => { });
    } catch { }
}

/**
 * Starts the sign up process of the raid
 * @param {Discord.Message} raid 
 * @param {Discord.Collection<String, *>} members 
 * @param {String} raiderRole 
 * @param {*} params 
 * @param {Date} date 
 * @param {String} info 
 * @param {String} ref 
 */
function startSignUps(raid, members, raiderRole, params, date, info, ref) {
    if ((new Date()).getTime() > date.getTime()) { // If the event ran out stop it.
        raid.edit(archivedRaid).catch(() => { });
        raid.clearReactions().catch(() => { });
        return;
    }

    const staffRole = params.roles.raiders.list.find(x => x.id === raiderRole).staff;

    // Only members of this raid group will get considered and administrators
    const autoFilter = (react, user) => react.emoji.name === autoSignUp
        && raid.guild.members.filter(member => !member.user.bot && (member.roles.has(raiderRole) || member.hasPermission('ADMINISTRATOR'))).has(user.id);
    const tentativeFilter = (react, user) => react.emoji.name === tentativeSignUp
        && raid.guild.members.filter(member => !member.user.bot && (member.roles.has(raiderRole) || member.hasPermission('ADMINISTRATOR'))).has(user.id);
    const manualFilter = (react, user) => react.emoji.name === manualSignUp
        && raid.guild.members.filter(member => !member.user.bot && (member.roles.has(raiderRole) || member.hasPermission('ADMINISTRATOR'))).has(user.id);
    const cancelFilter = (react, user) => react.emoji.name === cancelSignUp
        && raid.guild.members.filter(member => !member.user.bot && (member.roles.has(raiderRole) || member.hasPermission('ADMINISTRATOR'))).has(user.id);

    const adminFilter = (react, user) => react.emoji.name === adminSignUp
        && raid.guild.members.filter(member => !member.user.bot && (member.roles.has(staffRole) || member.hasPermission('ADMINISTRATOR'))).has(user.id);

    const autoCollector = raid.createReactionCollector(autoFilter);
    const tentativeCollector = raid.createReactionCollector(tentativeFilter);
    const manualCollector = raid.createReactionCollector(manualFilter);
    const absentCollector = raid.createReactionCollector(cancelFilter);
    const adminCollector = raid.createReactionCollector(adminFilter);

    // Listens to all the collected emojis. Users aren't allowed to react to all options, so the previous one will get removed.
    autoCollector.on('collect', react => {
        if ((new Date()).getTime() > date.getTime()) { // Ignore and stop if date passed.
            archiveRaid(raid, autoCollector, tentativeCollector, manualCollector, absentCollector, adminCollector);
            return;
        }

        const user = react.users.last();
        autoCollector.collected.first().remove(user.id);
        addRaidMember(user, raid, members, raiderRole, params, date, info, ref, status.ACTIVE);
    });

    tentativeCollector.on('collect', react => {
        if ((new Date()).getTime() > date.getTime()) { // Ignore and stop if date passed.
            archiveRaid(raid, autoCollector, tentativeCollector, manualCollector, absentCollector, adminCollector);
            return;
        }

        const user = react.users.last();
        tentativeCollector.collected.first().remove(user.id);
        addRaidMember(user, raid, members, raiderRole, params, date, info, ref, status.TENTATIVE);
    });

    manualCollector.on('collect', react => {
        if ((new Date()).getTime() > date.getTime()) { // Ignore and stop if date passed.
            archiveRaid(raid, autoCollector, tentativeCollector, manualCollector, absentCollector, adminCollector);
            return;
        }

        const user = react.users.last();

        manualCollector.collected.first().remove(user.id);

        // If the user has chosen the manual sign up, he/she will receive a DM asking what his name, class and role is. This will be then added to the raid list
        user.createDM().then(dm => {
            clearDMChats(user);
            dm.send('**You have chosen to manually sign up for the raid.**\n\nPlease tell me your ingame name, your class and your role (Tank or Healer) if you are not DPS. If you are not completely sure whether you can attend the raid or you might be late, then add a `*` to your name to indicate a tentative sign up!\nExample: `Paytime Druid Healer` or `Poortime* Mage`!');

            const filter = m => m.content.trim().length > 5 && m.content.trim().length < 50 && (m.content.trim().split(' ').length === 2 || m.content.trim().split(' ').length === 3);

            dmChats.push({
                user: user,
                collector: dm.createMessageCollector(filter, { time: 120000 })
            });

            dmChats[dmChats.length - 1].collector.on('collect', m => {
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

                let name = args[0];
                let isTentative = false;

                // Check whether this is a tentative sign up
                if (name.endsWith('*')) {
                    name = name.replace('*', '');
                    isTentative = true;
                }

                // Check if the player's name is not too long or too short
                if (name.length > 12 && name.length < 2) {
                    isOk = false;
                }

                if (!classrole || !role) {
                    isOk = false;
                }

                if (isOk) {
                    name = name.replace(/^\w/, c => c.toUpperCase());

                    members.delete(user.id);
                    members.set(user.id, {
                        id: user.id,
                        displayName: isTentative ? name + ` \`*\`` : name + ` \`${members.filter(x => x.status === status.ACTIVE).size + 1}\``,
                        roles: [classrole.id, role.id],
                        status: isTentative ? status.TENTATIVE : status.ACTIVE
                    });
                    const editedContent = signUpRoster(raid, members, raiderRole, params, date, info);
                    raid.edit(startmsg(ref, raiderRole), { embed: editedContent });

                    clearDMChats(user);
                    dm.send('👌');

                    // Store the data
                    storeSignUpData(raid, raiderRole, date, info, members, ref);
                } else {
                    dm.send('The input is invalid. Try again!');
                }
            });
        });
    });

    absentCollector.on('collect', react => {
        if ((new Date()).getTime() > date.getTime()) { // Ignore and stop if date passed.
            archiveRaid(raid, autoCollector, tentativeCollector, manualCollector, absentCollector, adminCollector);
            return;
        }

        const user = react.users.last();
        absentCollector.collected.first().remove(user.id);
        addRaidMember(user, raid, members, raiderRole, params, date, info, ref, status.ABSENT);
    });

    adminCollector.on('collect', react => {
        if ((new Date()).getTime() > date.getTime()) { // Ignore and stop if date passed.
            archiveRaid(raid, autoCollector, tentativeCollector, manualCollector, absentCollector, adminCollector);
            return;
        }

        const user = react.users.last();

        // Instantly remove reaction, so that user can keep using this option
        adminCollector.collected.first().remove(user.id);

        // User will receive a direct message and will be instructed on what options they can change
        user.createDM().then(dm => {
            clearDMChats(user);
            const maxLen = 400;

            dm.send(`**RAID \`${ref}\` OPTIONS**\n\nCommands:\n🡆 \`list\` - Posts an unformatted list of players with their sign up order.\n🡆 \`date dd-mm-yyyy/HH:MM\` - Changes the raid's schedule (in CET/CEST). Example: \`date 20-05-2020/15:00\`\n🡆 \`info YOUR_MESSAGE\` - Changes the info text. Max. length: ${maxLen} characters\n🡆 \`remove NUM\` - Removes a user from the sign up list. NUM is the user's sign up order.\n🡆 \`add ID\` - Adds or updates a member. ID is the player's discord ID, which you can retrieve by right clicking on their name and selecting 'Copy ID'.\n🡆 \`archive\` - Stops and archives the raid event. **THE RAID CANNOT BE RESTARTED!**\n🡆 \`cancel\` - Cancel this operation.`);

            const filter = m => m.content.trim().length >= 4 && m.content.trim().length <= maxLen + 10 && (
                m.content.trim().toLowerCase().startsWith('list') ||
                m.content.trim().toLowerCase().startsWith('date') ||
                m.content.trim().toLowerCase().startsWith('info') ||
                m.content.trim().toLowerCase().startsWith('remove') ||
                m.content.trim().toLowerCase().startsWith('add') ||
                m.content.trim().toLowerCase().startsWith('archive') ||
                m.content.trim().toLowerCase().startsWith('cancel'));

            dmChats.push({
                user: user,
                collector: dm.createMessageCollector(filter, { time: 300000 })
            });

            dmChats[dmChats.length - 1].collector.on('collect', m => {
                let err;

                let arr = m.content.trim().split(' ');
                const command = arr.shift().toLowerCase();
                const args = arr.join(' ').trim();

                const list = [];
                const orderedList = members.filter(m => m.status === status.ACTIVE).concat(members.filter(m => m.status === status.TENTATIVE));
                orderedList.forEach(m => {
                    list.push(memberToString(m, params, list.length + 1));
                });

                switch (command) {
                    case 'list':
                        dm.send(list.join('\n'), {
                            split: {
                                char: '\n'
                            }
                        }).catch((e) => { err = e; });
                        break;
                    case 'date':
                        try {
                            date = getdate(args);
                        } catch (formaterr) {
                            err = formaterr.message + "Try again!";
                        }
                        break;
                    case 'info':
                        if (args && args.length !== 0) {
                            if (args.length > maxLen) {
                                err = "The entered text is too long. Try again! Max. length: " + maxLen;
                            } else {
                                info = args;
                            }
                        } else {
                            info = defaultInfoText;
                        }
                        break;
                    case 'remove':
                        if (!args || args.length > 2 || !parseInt(args) || parseInt(args) < 1 || parseInt(args) > 99) {
                            err = "Not a valid number. Try again!"
                        }

                        const res = orderedList.array()[parseInt(args) - 1];

                        if (res) {
                            members.delete(res.id);
                        } else {
                            err = "Couldn't find user at this position. Try again!";
                        }
                        break;
                    case 'add':
                        if (!args || args.length > 50) {
                            err = "Not a valid input!"
                        }

                        const member = raid.guild.members.get(args);

                        if (member) {
                            members.delete(member.id);
                            members.set(member.id, {
                                id: member.id,
                                displayName: member.displayName + ` \`x\``,
                                roles: Array.from(member.roles.keys()),
                                status: status.ACTIVE
                            });
                        } else {
                            err = "Could not find member!";
                        }

                        break;
                    case 'archive':
                        archiveRaid(raid, autoCollector, tentativeCollector, manualCollector, absentCollector, adminCollector);
                        clearDMChats(user);
                        err = "Raid archived! 👌";
                        break;
                    case 'cancel':
                        clearDMChats(user);
                        err = "Cancelled! 👌";
                        break;
                    default:
                        err = "Unknown Error!";
                        break;
                }

                if (!err) {
                    dm.send('👌');
                    raid.edit(startmsg(ref, raiderRole), { embed: signUpRoster(raid, members, raiderRole, params, date, info) });

                    // Store the data
                    storeSignUpData(raid, raiderRole, date, info, members, ref);
                } else {
                    dm.send(err);
                }
            });
        });
    });
}

/**
 * Add a raid member to the member's list
 * @param {Discord.User} user 
 * @param {Discord.Message} raid 
 * @param {Discord.Collection<String, *>} members 
 * @param {String} raiderRole 
 * @param {*} params 
 * @param {Date} date 
 * @param {Info} info 
 * @param {String} ref 
 * @param {*} signUpStatus 
 */
function addRaidMember(user, raid, members, raiderRole, params, date, info, ref, signUpStatus) {
    const m = raid.guild.members.get(user.id);
    members.delete(user.id);

    let dn = m.displayName;

    if (signUpStatus === status.ACTIVE) {
        dn += ` \`x\``;
    } else if (signUpStatus === status.TENTATIVE) {
        dn += ` \`*\``;
    }

    members.set(user.id, {
        id: m.id,
        displayName: dn,
        roles: Array.from(m.roles.keys()),
        status: signUpStatus
    });
    const editedContent = signUpRoster(raid, members, raiderRole, params, date, info);
    raid.edit(startmsg(ref, raiderRole), { embed: editedContent });

    // Store the data
    storeSignUpData(raid, raiderRole, date, info, members, ref);
}

/**
 * Store a member entry in the database
 * @param {Discord.Message} raid 
 * @param {String} raiderRole 
 * @param {Date} date 
 * @param {String} info 
 * @param {Discord.Collection<String, *>} members 
 * @param {String} ref 
 */
function storeSignUpData(raid, raiderRole, date, info, members, ref) {
    const entry = JSON.stringify({
        raid: raid.id,
        channel: raid.channel.id,
        guild: raid.guild.id,
        raiderRole: raiderRole,
        date: date,
        info: info,
        members: members.array()
    });
    db.push(raid.client, ref, entry);
}

/**
 * Get the date and time from a string of the format dd-mm-yyyy/HH:MM
 * @param {*} str
 */
function getdate(str) {
    const formaterr = "Invalid Date. The correct format is: `dd-mm-yyyy/HH:MM`. Example: `20-05-2020/19:30`. ";

    if (!str) {
        throw new Error(formaterr);
    }

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

    const content = signUpRoster(msg, new Discord.Collection(), raiderRole, params, date, defaultInfoText);

    signUpChannel.send('Working...')
        .then((raid) => {
            // prepare entry
            const entry = JSON.stringify({
                raid: raid.id,
                channel: raid.channel.id,
                guild: raid.guild.id,
                raiderRole: raiderRole,
                date: date,
                info: defaultInfoText,
                members: []
            });

            // Store data in db, add buttons and then start the raid
            db.commit(msg.client, entry, (ref) => {
                raid.edit(startmsg(ref, raiderRole), { embed: content })
                    .then(async function () {
                        await raid.react(autoSignUp);
                        await raid.react(tentativeSignUp);
                        await raid.react(manualSignUp);
                        await raid.react(cancelSignUp);
                        await raid.react(adminSignUp);
                    })
                    .then(startSignUps(raid, new Discord.Collection(), raiderRole, params, date, defaultInfoText, ref));
            });
        });
}

/**
 * Returns a member of a raid event as a string
 * @param {*} m 
 * @param {*} params
 * @param {*} i
 */
function memberToString(m, params, i) {
    const help = m.displayName.substring(0, m.displayName.length - 1).split(' `');
    const displayName = `**${help[0]}**`;
    const order = help[1] === '*' ? `* (${i})` : help[1];

    let myClass;
    params.roles.classes.list.some(entry => {
        if (m.roles.includes(entry.id)) {
            myClass = entry.emoji.toUpperCase();
            return true;
        }
        return false;
    });

    let role;
    params.roles.roles.list.some(entry => {
        if (m.roles.includes(entry.id)) {
            role = entry.emoji.toUpperCase();
            return true;
        }
        return false;
    });

    return `${order} ${displayName} ${myClass} ${role}`;
}

/**
 * Stops all messages collectors of a user.
 * @param {Discord.User} user 
 */
function clearDMChats(user) {
    dmChats.filter(d => d.user === user).forEach(d => {
        d.collector.stop();
    });

    dmChats = dmChats.filter(d => d.user !== user);
}

module.exports = {
    empty: empty,
    status: status,
    autoSignUp: autoSignUp,
    tentativeSignUp: tentativeSignUp,
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