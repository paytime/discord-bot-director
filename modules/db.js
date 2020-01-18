'use strict';

const Discord = require('discord.js');
const Buffer = require('buffer/').Buffer;

const dbchannelId = process.env.DBCHANNELID;
const serverId = process.env.SERVERID;

const wip = 'Working...';

const splitChar = '*';

/**
 * Stores data in the databse
 * @param {Discord.Client} bot 
 * @param {String} data 
 * @param {*} result 
 */
function storeData(bot, data, result) {
    const c = checkValidChannel(bot);

    // Encode the data
    let base64 = Buffer.from(data, 'utf8').toString('base64');

    if (base64.length > 1950) {
        base64 = addSplitChars(base64, 1940);
    }

    c.send({
        embed: {
            title: wip,
            description: wip
        }
    }).then(msg => {
        // The data will be split up if too big. The references to the chunks will then be stored in the original message
        c.send(base64, {
            split: {
                char: splitChar
            }
        }).then(chunks => {
            let refs;
            if (Array.isArray(chunks)) {
                refs = chunks[0].id;
                for (let i = 1; i < chunks.length; i++) {
                    refs += "\n" + chunks[i].id;
                }
            } else {
                refs = chunks.id;
            }

            msg.edit({
                embed: {
                    title: msg.id,
                    description: refs
                }
            }).then(() => {
                // Notify the user with the reference id
                result(msg.id);
            }).catch(err => {
                console.error('An Error occured while while editing new data: ' + err);
            });
        }).catch(err => {
            console.error('An Error occured while storing the raw data: ' + err);
        });
    }).catch(err => {
        console.error('An Error occured while storing data: ' + err);
    });
}

/**
 * Adds a split character every n characters
 * @param {*} str 
 * @param {*} n 
 */
function addSplitChars(str, n) {
    let ret = [];
    let i, len;

    for (i = 0, len = str.length; i < len; i += n) {
        ret.push(str.substring(i, n));
    }
    return ret.join(splitChar);
}

/**
 * Updates existing data
 * @param {Discord.Client} bot 
 * @param {String} ref 
 * @param {String} data 
 */
function updateData(bot, ref, data) {
    const c = checkValidChannel(bot);

    // Encode the data
    const base64 = Buffer.from(data, 'utf8').toString('base64');

    if (base64.length > 1950) {
        base64 = addSplitChars(base64, 1940);
    }

    c.fetchMessage(ref).then(msg => {
        // Delete the old references
        msg.embeds[0].description.split('\n').forEach((o => {
            c.fetchMessage(o).then(m => {
                m.delete();
            }).catch(err => {
                console.error('An Error occured while removing old data: ' + err);
            });
        }));

        c.send(base64, {
            split: {
                char: splitChar
            }
        }).then(chunks => {
            let refs;
            if (Array.isArray(chunks)) {
                refs = chunks[0].id;
                for (let i = 1; i < chunks.length; i++) {
                    refs += " " + chunks[i].id;
                }
            } else {
                refs = chunks.id;
            }

            msg.edit({
                embed: {
                    title: msg.id,
                    description: refs
                }
            });
        }).catch(err => {
            console.error('An Error occured while sending updated data: ' + err);
        });
    }).catch(err => {
        console.error('An Error occured while upatind data: ' + err);
    });
}

/**
 * Retrieves all the data via reference id
 * @param {Discord.Client} bot 
 * @param {String} ref 
 * @param {*} result 
 */
function retrieveData(bot, ref, result) {
    const c = checkValidChannel(bot);
    const chunks = [];

    c.fetchMessage(ref).then(msg => {
        // First collect all encoded chunks
        msg.embeds[0].description.split('\n').forEach(chunkId => {
            c.fetchMessage(chunkId).then(chunk => {
                chunks.push(chunk.content);
            }).then(() => {
                chunks.sort((a, b) => {
                    a - b
                });

                const data = Buffer.from(chunks.join(), 'base64').toString('utf8');
                result(JSON.parse(data));
            }).catch(err => {
                console.error('An Error occured while retrieving data: ' + err);
            });
        }).catch(err => {
            console.error('An Error occured while retrieving data: ' + err);
        });
    }).catch(err => {
        console.error('An Error occured while retrieving data: ' + err);
    });
}

/**
 * Checks if the dbchannel exists and returns it.
 * @param {Discord.Client} bot 
 * @returns {Discord.TextChannel}
 */
function checkValidChannel(bot) {
    const guild = bot.guilds.get(serverId);
    if (!guild) {
        throw new Error('Guild does not exist.');
    }

    const channel = guild.channels.get(dbchannelId);
    if (!channel) {
        throw new Error('Channel does not exist.');
    }

    return channel;
}

module.exports = {
    channelId: dbchannelId,
    commit: storeData,
    push: updateData,
    pull: retrieveData
}