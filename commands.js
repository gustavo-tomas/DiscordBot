import yts from 'yt-search';
import ytdl from 'ytdl-core';
import { queue } from './index.js';
import { client } from './index.js';

// sound values
const startingSoundValue = 3;
const ANNOYANCE_FACTOR = 5;

export async function execute(message, serverQueue) {
    const args = message.content.split(" ");    // !p url -> args[0] = !p ; args[1] = url

    // checks permissions
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
        return message.channel.send("You need to be in a voice channel to do that!");
    }
    
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send("I need permission to join and speak in this channel!");
    }
    
    var videoUrl;
    const expression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
    const urlExpression = new RegExp(expression);

    // complete URL
    if (args[1].match(urlExpression)) {
        videoUrl = args[1];
    } else {
        // search
        videoUrl = await (await yts(message.content.replace("!p", ""))).videos[0].url;
    }
    const songInfo = await ytdl.getInfo(videoUrl);
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
    };
    
    // checks if song is playing
    if (!serverQueue) {
        // Creating the contract for queue
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: startingSoundValue,
            playing: true,
        };

        // Setting the queue using our contract
        queue.set(message.guild.id, queueContruct);
        
        // Pushing the song to our songs array
        queueContruct.songs.push(song);
        
        try {
            // Here we try to join the voicechat and save our connection into our object.
            var connection = await voiceChannel.join();
            queueContruct.connection = connection;
        
            // Calling the play function to start a song
            play(message.guild, queueContruct.songs[0]);
        } catch (err) {
            // Printing the error message if the bot fails to join the voicechat
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(song);
        console.log(serverQueue.songs);
        return message.channel.send(`${song.title} has been added to the queue!`);
    }
}

export function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }
    
    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Started playing: **${song.title}**`);
}

export function skip(message, serverQueue) {
    if (!message.member.voice.channel) {
        return message.channel.send("You have to be in a voice channel to skip the music!");
    }
    if (!serverQueue) {
        return message.channel.send("There is no song to skip!");
    }
    serverQueue.connection.dispatcher.end();
}

export function stop(message, serverQueue) {
    if (!message.member.voice.channel) {
        return message.channel.send("You have to be in a voice channel to stop the music!");
    }
    if (!serverQueue) {
        return message.channel.send("There is no song to stop!");
    }
    message.channel.send("**Leaving...**");
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

// TODO: update help commands with next, n, leave,  ... 
export function help(message) {
    const helpMessage = `**Hello ${message.author}!**\n` + 
    `My name is ${client.user}. I can play music for you.\n` +
    `To queue a song just type *!play song_url* or *!p song_url*\n` +
    `You can also search by name instead of using an url.\n` +
    `To skip the current song, type *!skip*\n` +
    `To stop the bot, type *!stop*\n` +
    `Type *!commands* to see the list of available commands`;
    return message.channel.send(helpMessage);
}

export function commands(message) {
    const commandsMessage = `**${client.user} COMMANDS**\n` +
                            `**!play** or **!p**       -> Queue a song\n` +
                            `**!search** or **!queue** -> Same as play\n` +
                            `**!skip**                 -> Skip current song\n` +
                            `**!next** or **!n**       -> Same as skip\n` +
                            `**!stop** or **!leave**   -> Stop the bot\n` +
                            `**!c** or **!commands**   -> Show all available commands` +
                            `**!help** or **h**        -> Show help`;
    return message.channel.send(commandsMessage);
}

export function seixas(message) {
    // for (let i = 0; i < ANNOYANCE_FACTOR; i++) {
    const ownerId = message.guild.ownerID;
    const list = client.guilds.cache.get(message.guild.id);
    const ownerName = list.members.cache.filter(filterOwnerId);

    function filterOwnerId(value) {
        return value === ownerId;
    }

    console.log(ownerId)
    console.log(ownerName)
    console.log(ownerName.user)
    // }
}