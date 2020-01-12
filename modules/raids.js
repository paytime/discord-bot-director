'use strict';
const fs = require('fs');
const raidsFile = './config/raids.json';
const Discord = require('discord.js');
const iconURL = process.env.ICONURL;
const empty = '\u200b';
const startmsg = 'Raid initiated';
const autoSignUp = '✅';
const manualSignUp = '#️⃣';
const cancelSignUp = '❎';

/**
 * Restarts all still active raids
 * @param {Discord.Client} bot 
 * @param {*} params 
 */
function restartRaids(bot, params) {
    retrieveRaids((raids) => {
        // Remove old file and register again all raids
        fs.unlink(raidsFile, (err) => {
            if (err) {
                throw new Error("Couldn't remove raids file");
            }

            // Check if the entries are still valid. If yes, register raid
            raids.forEach(entry => {
                const guild = bot.guilds.get(entry.guild);
                if (!guild || guild === null) return;

                const channel = guild.channels.get(entry.channel);
                if (!channel || channel === null) return;

                const role = guild.roles.get(entry.raiderRole);
                if (!role || role === null) return;

                channel.fetchMessage(entry.raid)
                    .then(raid => {
                        // Check if members are still valid
                        const members = new Discord.Collection();
                        for (let i = 0; i < entry.members.length; i++) {
                            const member = guild.members.get(entry.members[i].id);
                            if (member) {
                                members.set(member.id, {
                                    id: member.id,
                                    roles: member.roles,
                                    displayName: member.displayName
                                });
                            }
                        }

                        console.log(`Found raid '${entry.raid}' - Restarting...`);
                        registerRaid(raid, members, entry.raiderRole, params, true);
                    })
                    .catch(() => {
                        console.info(`Removing cancelled raid '${entry.raid}'`);
                    });
            });
        });
    });
}

/**
 * Checks if the user has permission with mess with raids and return the user's raider role.
 * @param {Discord.Message} msg 
 * @param {Array<String>} args 
 * @param {*} params 
 */
function fetchRaiderRole(msg, args, params) {
    const leaderRoleId = params.roles.raiders.leader;
    const assistRoleId = params.roles.raiders.assist;

    if (!msg.member.hasPermission('ADMINISTRATOR') && !msg.member.roles.has(leaderRoleId) && !msg.member.roles.has(assistRoleId)) {
        throw new Error('You do not have the permission to use this command.');
    }

    // Check if first argument is a raider role, otherwise take user's raider role
    let raiderRole;
    if (args && args.length > 0 && args[0].startsWith('<@&') && args[0].endsWith('>')) {
        const roleId = args[0].slice(3, -1);

        if (params.roles.raiders.list.some(x => x.id === roleId)) {
            raiderRole = roleId;
        } else {
            throw new Error('Role is not a raider role.');
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

    return raiderRole;
}

/**
 * Posts a roster of a raid
 * @param {Discord.Message} msg 
 * @param {Discord.Collection<String, Discord.GuildMember>} members 
 * @param {*} raiderRole 
 * @param {*} params 
 */
function roster(msg, members, raiderRole, params) {
    // Get the raid's info
    const raidInfo = params.roles.raiders.list.find(x => x.id === raiderRole);

    // Find the raid's leader and assists
    const raidLeader = msg.guild.members.find(member => member.roles.has(raiderRole) && member.roles.has(params.roles.raiders.leader));
    const raidAssists = msg.guild.members.filter(member => member.roles.has(raiderRole) && member.roles.has(params.roles.raiders.assist)).array();

    raidAssists.toString = function () {
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
            value: `**📅 ${raidInfo.days}**`,
            inline: true
        },
        {
            name: empty,
            value: `**🕒 ${raidInfo.schedule}**`,
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
        thumbnail: {
            url: iconURL
        },
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
 */
function signUpRoster(msg, members, raiderRole, params) {
    // Creates a raid window
    const content = roster(msg, members, raiderRole, params);

    // Append the info about the sign up emojis
    content.fields.push({
        name: empty,
        value: `**${autoSignUp} - AUTO SIGN UP\n\n${manualSignUp} - MANUAL SIGN UP (For Alts)\n\n${cancelSignUp} - ABSENT**`,
        inline: false
    });

    return content;
}

/**
 * Retrieves all active raids
 * @param {*} fn 
 */
function retrieveRaids(fn) {
    fs.readFile(raidsFile, { encoding: 'utf8', flag: 'a+' }, (err, data) => {
        if (err) {
            throw new Error("Failed to read file raids.json: " + err);
        }

        let parsedData;

        try {
            if (data && data !== "{}") {
                parsedData = JSON.parse(data);
            }
        } catch (err) {
            throw new Error("Failed to parse raids-file: " + err);
        }

        let map = new Discord.Collection();

        // Apply data to collection. Raid ID's are to be set as keys
        try {
            if (parsedData && parsedData !== {} && parsedData.length > 0) {
                for (let i = 0; i < parsedData.length; i++) {
                    const entry = parsedData[i];
                    map.set(entry.raid, entry);
                }
            }
        } catch (err) {
            throw new Error('Cannot apply raids data: ' + err);
        }

        // Callback
        fn(map);
    });
}

/**
 * Saves a raid and starts it if specified
 * @param {Discord.Message} raid 
 * @param {Discord.Collection<String, Discord.GuildMember>} members 
 * @param {*} raiderRole 
 * @param {*} params 
 * @param {*} start 
 */
function registerRaid(raid, members, raiderRole, params, start) {
    retrieveRaids((raids) => { // Retrieve the raids map first
        // Prepare members roles
        /*const prepMembers = members.array();
        for (let i = 0; i < prepMembers.length; i++) {
            prepMembers[i].roles = Array.from(prepMembers[i].roles.keys());
        }*/

        // Prepare entry
        const entry = {
            raid: raid.id,
            channel: raid.channel.id,
            guild: raid.guild.id,
            members: members.array(),
            raiderRole: raiderRole
        }

        // Add to map
        raids.set(raid.id, entry);

        // Write to file
        fs.writeFile(raidsFile, JSON.stringify(raids.array()), 'utf8', (err) => {
            if (err) {
                throw new Error('Failed to write to raids-file: ' + err);
            }

            // Finally, start the raid
            if (start) startSignUps(raid, members, raiderRole, params);
        });
    });
}

/**
 * Starts the sign up process of the raid
 * @param {Discord.Message} raid 
 * @param {Discord.Collection<String, Discord.GuildMember>} members 
 * @param {*} raiderRole 
 * @param {*} params 
 */
function startSignUps(raid, members, raiderRole, params) {
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
        const editedContent = signUpRoster(raid, members, raiderRole, params);
        raid.edit(startmsg, { embed: editedContent });

        // Save the raid
        registerRaid(raid, members, raiderRole, params, false);
    });

    manualCollector.on('collect', react => {
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
                    const editedContent = signUpRoster(raid, members, raiderRole, params);
                    raid.edit(startmsg, { embed: editedContent });

                    messageCollector.stop();
                    dm.send('👌');

                    // Save the raid
                    registerRaid(raid, members, raiderRole, params, false);
                } else {
                    dm.send('The input is invalid. Try again!');
                }
            });
        });
    });

    absentCollector.on('collect', react => {
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
            const editedContent = signUpRoster(raid, members, raiderRole, params);
            raid.edit(startmsg, { embed: editedContent });

            // Save the raid
            registerRaid(raid, members, raiderRole, params, false);
        }
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
    restartRaids: restartRaids,
    roster: roster,
    registerRaid: registerRaid,
    signUpRoster: signUpRoster,
    startSignUps: startSignUps
};