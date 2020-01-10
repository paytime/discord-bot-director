const Discord = require('discord.js');

module.exports = {
    name: 'roster',
    description: 'Displays the raid roster of the user\'s raid group or of a specified raid. Syntax: `@bot roster [@Raider Role]`',
    /**
     * The execute command
     * @param {Discord.Message} msg 
     * @param {Array<String>} args 
     * @param {*} options 
     */
    execute(msg, args, options) {
        const leaderRoleId = options.roles.raiders.leader;
        const assistRoleId = options.roles.raiders.assist;

        if (!msg.member.hasPermission('ADMINISTRATOR') && !msg.member.roles.has(leaderRoleId) && !msg.member.roles.has(assistRoleId)) {
            throw new Error('You do not have the permission to use this command.');
        }

        // Check if first argument is a raider role, otherwise take user's raider role
        let raiderRole;
        if (args && args.length > 0 && args[0].startsWith('<@&') && args[0].endsWith('>')) {
            const roleId = args[0].slice(3, -1);

            if (options.roles.raiders.list.some(x => x.id === roleId)) {
                raiderRole = roleId;
            } else {
                throw new Error('Role is not a raider role.');
            }
        } else {
            // Find the user's first raider role
            for (let i = 0; i < options.roles.raiders.list.length; i++) {
                const roleId = options.roles.raiders.list[i].id;

                if (msg.member.roles.has(roleId)) {
                    raiderRole = roleId;
                    break;
                }
            }

            if (!raiderRole) {
                throw new Error('You are not a member of any raid group.');
            }
        }

        // Find and store everyone with the raider role
        const members = msg.guild.members.filter(member => member.roles.has(raiderRole));

        // Get the raid's info
        const raidInfo = options.roles.raiders.list.find(x => x.id === raiderRole);

        // Find the raid's leader and assists
        const raidLeader = members.find(member => member.roles.has(leaderRoleId));
        const raidAssists = members.filter(member => member.roles.has(assistRoleId)).array();

        raidAssists.toString = function() {
            return this.join(' ');
        };

        const empty = '\u200b';

        // Create fields for each role/class combo
        const classes = options.roles.classes.list;
        const roles = options.roles.roles.list;

        Array.prototype.toString = function() {
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

        const emoji = function(roleCount) {
            return msg.guild.emojis.find(e => e.name === roles[roleCount].emoji)
        };

        const sort = function(a, b) {
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
                value: `**${emoji(0)} Tanks - ${tanks.length}\n${empty}**`,
                inline: true
            },
            {
                name: empty,
                value: `**${emoji(2)} DPS - ${members.filter(m => m.roles.has(roles[2].id)).size}\n${empty}**`,
                inline: true
            },
            {
                name: empty,
                value: `**${emoji(1)} Healers - ${members.filter(m => m.roles.has(roles[1].id)).size}\n${empty}**`,
                inline: true
            }
        ];

        if (tanks.length > 0) fields.push({
            name: `**${msg.guild.emojis.find(e => e.name === roles[0].emoji)} Tanks (${tanks.length})**`,
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

        const content = {
            embed: {
                timestamp: new Date(),
                title: `${raidInfo.emoji} Raid ${raidInfo.name}`,
                description: `**Leader:** ${raidLeader}\n**Assistants:** ${raidAssists}`,
                color: 16715264,
                thumbnail: {
                    url: options.iconUrl
                },
                fields: fields,
                footer: {
                    icon_url: options.iconUrl,
                    text: `© <${msg.guild.name}>`
                }
            }
        };

        // Finally post the roster
        msg.channel.send(content);
    }
}