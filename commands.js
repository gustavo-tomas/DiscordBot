import ytsr from 'ytsr';
import ytdl from 'ytdl-core';
import ytpl from 'ytpl';
import { queue }  from './index.js';
import { client } from './index.js';

// Sound values
const startingSoundValue = 3;

export async function execute(message, serverQueue) {
    const args = message.content.split(" ");    // !p url -> (args[0] = !p ; args[1] = url)

    // Checks permissions
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
        return message.channel.send("You need to be in a voice channel to do that!");
    }
    
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send("I need permission to join and speak in this channel!");
    }
    
    // Expression matches a playlist and stream
    const plExpression  = new RegExp(/list=/);
    const strExpression = new RegExp(/stream/);
    
    // SongList is an array of type {title: , url: }
    let videoTitle, videoUrl, songList = [];
    
    /**
     * See if this can be DRYed
     */
    try {
        // Request for a radio stream (!stream <genre of song>) limited to 15 songs
        if (args[0].match(strExpression)) {
            const batch = await ytsr(message.content.replace("!stream", ""), { limit: 15 });
            const filteredBatch = batch.items.filter(video => video.type === 'video');
            filteredBatch.forEach((item) => songList.push({ title: item.title, url: item.url }));
        }
        // If url is a video and not a playlist
        else if (ytdl.validateURL(args[1]) && !(args[1].match(plExpression))) {
            const details = (await ytdl.getInfo(args[1])).videoDetails;
            songList.push({ title: details.title, url: details.video_url });
        }
        // Else if url is a playlist 
        else if (args[1].match(plExpression)) {
            const batch = (await ytpl(args[1], { limit: 15 })).items;
            batch.forEach((item) => songList.push({ title: item.title, url: item.url }));
        }
        // Else treat the message as a search query with search results limited to 1
        else {
            const batch = await ytsr(message.content.replace("!p", ""), { limit: 1 });
            const filteredBatch = batch.items.filter(video => video.type === 'video');
            videoTitle = filteredBatch[0].title;
            videoUrl   = filteredBatch[0].url;
            songList.push({title: videoTitle, url: videoUrl});
        }
    } catch (error) {
        console.error("Error when fetching batch: ", error);
        return message.channel.send("Error when fetching batch: ", error);
    }
    
    try {
        // Checks if song is playing
        if (!serverQueue) {
            // Creating the contract for queue
            const queueContruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: startingSoundValue,
                playing: true,
            }
    
            // Setting the queue using our contract
            queue.set(message.guild.id, queueContruct);
            
            // Pushing the song to our songs array
            queueContruct.songs.push(...songList);
            
            try {
                // Here we try to join the voicechat and save our connection into our object.
                var connection = await voiceChannel.join();
                queueContruct.connection = connection;
            
                // Calling the play function to start a song
                play(message.guild, queueContruct.songs[0]);
            } catch (err) {
                // Printing the error message if the bot fails to join the voicechat
                console.error("Error when joining voice: ", err);
                queue.delete(message.guild.id);
                return message.channel.send("Error when joining voice: ", err);
            }
        } else {
            serverQueue.songs.push(...songList);
            return message.channel.send(`**${songList[0].title}** has been added to the queue!`);
        }
    } catch (error) {
        console.error("Error when playing song: ", error);
        return message.channel.send("Error when playing song: ", error);
    }
}

export function play(guild, song) {
    try {
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
            .on("error", error => {
                console.error("Error when dispatching song: ", error);
                return message.channel.send("Error when dispatching song: ", error);
            });
        dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
        serverQueue.textChannel.send(`Started playing: **${song.title}**`);
    } catch (error) {
        console.error("Error when playing song: ", error);
        return message.channel.send("Error when playing song: ", error);
    }
}

export function skip(message, serverQueue) {
    if (!message.member.voice.channel) {
        return message.channel.send("You have to be in a voice channel to skip the music!");
    }
    if (!serverQueue) {
        return message.channel.send("There is no song to skip!");
    }
    try {
        serverQueue.connection.dispatcher.end();
    } catch (error) {
        console.log("Error when skipping song: ", error);
        return message.channel.send("Error when skipping song: ", error);
    }
}

export function stop(message, serverQueue) {
    if (!message.member.voice.channel) {
        return message.channel.send("You have to be in a voice channel to stop the music!");
    }
    if (!serverQueue) {
        return message.channel.send("There is no song to stop!");
    }
    try {
        message.channel.send("**Leaving...**");
        serverQueue.songs = [];
        serverQueue.connection.dispatcher.end();
        return;
    } catch (error) {
        console.log("Error when leaving: ", error);
        return message.channel.send("Error when leaving: ", error);
    }
}

// Dont forget to update help commands after changes
export function help(message) {
    if (!message.member.voice.channel) {
        return message.channel.send("You have to be in a voice channel to do that!");
    }
    const helpMessage = `**Hello ${message.author}!**\n` +
    `My name is ${client.user}. I can play music for you.\n` +
    `To queue a song just type **!play <song_url>** or **!p <song_url>**\n` +
    `You can also search by name instead of using an url.\n` +
    `To skip the current song, type **!skip**\n` +
    `To stop the bot, type **!stop**\n` +
    `To stream a song genre, type **!stream <song_genre>**\n` +
    `Type **!commands** to see the list of available commands`;
    return message.channel.send(helpMessage);
}

export function commands(message) {
    if (!message.member.voice.channel) {
        return message.channel.send("You have to be in a voice channel to do that!");
    }
    const commandsMessage =
        `**${client.user} COMMANDS**\n` +
        `**!play <song_url>** or **!p <song_url>**\t\t\t\t\t\t -> Queue a song\n` +
        `**!search <song_name>** or **!queue <song_name>** -> Same as play\n` +
        `**!skip**\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t-> Skip current song\n` +
        `**!next** or **!n**\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t  -> Same as skip\n` +
        `**!stop** or **!leave**\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t  -> Stop the bot\n` +
        `**!stream <song_genre>**\t\t\t\t\t\t\t\t\t\t\t  -> Stream a song genre\n` +
        `**!c** or **!commands**\t\t\t\t\t\t\t\t\t\t\t\t\t\t  -> Show all available commands\n` +
        `**!help** or **!h**\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t  -> Show help`;
    return message.channel.send(commandsMessage);
}

export async function seixas(message) {
    const args = message.content.split(" ");
    let bomb = "", owner = await client.users.fetch(message.guild.ownerID);
    if (args.length < 2 || isNaN(Number(args[1]))) {
        bomb = `Atende ${owner}\n`;
    } else {
        for (let i = 0; i < Number(args[1]); i++) {
            bomb = bomb + `Atende ${owner}\n`;
        }
    }
    return message.channel.send(bomb);
}
