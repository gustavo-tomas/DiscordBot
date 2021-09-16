const Discord = require('discord.js');
const {
    prefix,
    token,
} = require('./config.json');
const ytdl = require('ytdl-core');

const client = new Discord.Client();
const queue = new Map();

client.once('ready', () => {
    console.log('Ready!');
});
client.once('reconnecting', () => {
    console.log('Reconnecting!');
});
client.once('disconnect', () => {
    console.log('Disconnect!');
});

// read messages
client.on('message', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;
    
    // music queue
    const serverQueue = queue.get(message.guild.id);
    
    // bot commands
    if (message.content.startsWith(`${prefix}play`) ||
        message.content.startsWith(`${prefix}p`)) {
        execute(message, serverQueue);
        return;
    }
    else if (message.content.startsWith(`${prefix}skip`)) {
        skip(message, serverQueue);
        return;
    }
    else if (message.content.startsWith(`${prefix}stop`)) {
        stop(message, serverQueue);
        return;
    }
    else {
        message.channel.send("Invalid command!");
    }
})

async function execute(message, serverQueue) {
    const args = message.content.split(" ");

    // checks permissions
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
        return message.channel.send("You need to be in a voice channel to play music!");
    }
    
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send("I need permission to join and speak in this channel!");
    }
    
    const songInfo = await ytdl.getInfo(args[1]);
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
            volume: 3,
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

function play(guild, song) {
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
    serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}

function skip(message, serverQueue) {
    if (!message.member.voice.channel) {
        return message.channel.send("You have to be in a voice channel to skip the music!");
    }
    if (!serverQueue) {
        return message.channel.send("There is no song to skip!");
        serverQueue.connection.dispatcher.end();
    }
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel) {
        return message.channel.send("You have to be in a voice channel to stop the music!");
    }

    if (!serverQueue) {
        return message.channel.send("There is no song to stop!");
    }

    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

client.login(token);