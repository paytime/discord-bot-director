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

    if (base64.length >= 1950) {
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
            msg.edit({
                embed: {
                    title: msg.id,
                    description: combineChunkReferences(chunks)
                }
            }).then(() => {
                // Notify the user with the reference id
                result(msg.id);
            }).catch(err => {
                console.error('An Error occured while while storing new data: ' + err);
            });
        }).catch(err => {
            console.error('Could not store new data: ' + err);
        });
    }).catch(err => {
        console.error('An Error occured while storing data: ' + err);
    });
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
    let base64 = Buffer.from(data, 'utf8').toString('base64');

    if (base64.length >= 1950) {
        base64 = addSplitChars(base64, 1940);
    }

    c.fetchMessage(ref).then(msg => {
        const oldRefs = msg.embeds[0].description;

        c.send(base64, {
            split: {
                char: splitChar
            }
        }).then(chunks => {
            msg.edit({
                embed: {
                    title: msg.id,
                    description: combineChunkReferences(chunks)
                }
            }).then(() => {
                // Delete the old references
                oldRefs.split('\n').forEach(o => {
                    c.fetchMessage(o).then(m => {
                        m.delete(1000).catch(err => {
                            console.error('Old chunk message does not exist: ' + err);
                        });
                    }).catch(() => {}); // Ignore missing errors
                });
            }).catch(err => {
                console.error('Could not update reference holder: ' + err);
            });
        }).catch(err => {
            console.error('Could not update content: ' + err);
        });
    }).catch(err => {
        console.error('An Error occured while updating data: ' + err);
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
                const data = Buffer.from(chunks.join('').replace(splitChar, ''), 'base64').toString('utf8');
                try{
                    const parsed = JSON.parse(data);
                    result(parsed);
                } catch {} // Do nothing when the JSON cannot be parsed yet.     
            }).catch(err => {
                console.error('Could not find chunk message of id ' + chunkId + ': ' + err);
            });
        });
    }).catch(err => {
        console.error('Could not find data: ' + err);
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

/**
 * Combines all chunk message id's
 * @param {*} chunks 
 */
function combineChunkReferences(chunks) {
    let refs;

    if (Array.isArray(chunks)) {
        refs = chunks[0].id;
        for (let i = 1; i < chunks.length; i++) {
            refs += "\n" + chunks[i].id;
        }
    } else {
        refs = chunks.id;
    }

    return refs;
}

/**
 * Adds a split character every n characters
 * @param {*} str 
 * @param {*} n 
 */
function addSplitChars(str, n) {
    let output = '';
    for (let i = 0; i < str.length; i++) {
        if (i > 0 && i % n == 0)
            output += splitChar;
        output += str.charAt(i);
    }

    return output;
}

module.exports = {
    channelId: dbchannelId,
    commit: storeData,
    push: updateData,
    pull: retrieveData
}