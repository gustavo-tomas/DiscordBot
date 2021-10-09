import ytsr from 'ytsr'
import ytdl from 'ytdl-core'
import ytpl from 'ytpl'
import { queue }  from './index.js'
import { client } from './index.js'

// Sound values
const startingSoundValue = 3

export async function execute(message, serverQueue) {
    const args = message.content.split(" ")    // !p url -> (args[0] = !p ; args[1] = url)

    // Checks permissions
    const voiceChannel = message.member.voice.channel
    if (!voiceChannel) {
        return message.channel.send("You need to be in a voice channel to do that!")
    }
    
    const permissions = voiceChannel.permissionsFor(message.client.user)
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send("I need permission to join and speak in this channel!")
    }
    
    // Expression matches a playlist and stream
    const plExpression  = new RegExp(/list=/)
    const strExpression = new RegExp(/stream/)
    
    // SongList is an array of type {title: , url: }
    let videoTitle, videoUrl, songList = []
    
    /**
     * See if there is a cleaner way to do streaming. Right now it makes a search and
     * queues 15 (or less) songs found in that search.
     */
    // Request for a radio stream (!stream <genre of song>) limited to 15 songs
    if (args[0].match(strExpression)) {
        const batch = await ytsr(message.content.replace("!stream", ""), { limit: 15 })
        const filteredBatch = batch.items.filter(video => video.type === 'video')
        for (let i = 0; i < filteredBatch.length; i++) {
            videoTitle = filteredBatch[i].title
            videoUrl   = filteredBatch[i].url
            songList.push({ title: videoTitle, url: videoUrl })
        }
    } else if (ytdl.validateURL(args[1])) {
        // If url is a video
        const videoDetails = (await ytdl.getInfo(args[1])).videoDetails
        videoTitle = videoDetails.title
        videoUrl   = videoDetails.video_url
        songList.push({title: videoTitle, url: videoUrl})
    } else if (args[1].match(plExpression)) {
        // Else if url is a playlist 
        const batch = (await ytpl(args[1], { limit: 15 })).items
        batch.forEach((item) => songList.push({ title: item.title, url: item.url }))
    } else {
        // Else treat the message as a search query with search results limited to 5 videos
        const batch = await ytsr(message.content.replace("!p", ""), { limit: 5 })
        const filteredBatch = batch.items.filter(video => video.type === 'video')
        videoTitle = filteredBatch[0].title
        videoUrl   = filteredBatch[0].url
        songList.push({title: videoTitle, url: videoUrl})
    }
    
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
        };

        // Setting the queue using our contract
        queue.set(message.guild.id, queueContruct)
        
        // Pushing the song to our songs array
        queueContruct.songs.push(...songList)
        
        try {
            // Here we try to join the voicechat and save our connection into our object.
            var connection = await voiceChannel.join()
            queueContruct.connection = connection
        
            // Calling the play function to start a song
            play(message.guild, queueContruct.songs[0])
        } catch (err) {
            // Printing the error message if the bot fails to join the voicechat
            console.log(err)
            queue.delete(message.guild.id)
            return message.channel.send(err)
        }
    } else {
        serverQueue.songs.push(...songList)
        return message.channel.send(`**${songList[0].title}** has been added to the queue!`)
    }
}

export function play(guild, song) {
    const serverQueue = queue.get(guild.id)
    if (!song) {
        serverQueue.voiceChannel.leave()
        queue.delete(guild.id)
        return
    }
    
    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0])
        })
        .on("error", error => console.error(error))
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5)
    serverQueue.textChannel.send(`Started playing: **${song.title}**`)
}

export function skip(message, serverQueue) {
    if (!message.member.voice.channel) {
        return message.channel.send("You have to be in a voice channel to skip the music!")
    }
    if (!serverQueue) {
        return message.channel.send("There is no song to skip!")
    }
    serverQueue.connection.dispatcher.end()
}

export function stop(message, serverQueue) {
    if (!message.member.voice.channel) {
        return message.channel.send("You have to be in a voice channel to stop the music!")
    }
    if (!serverQueue) {
        return message.channel.send("There is no song to stop!")
    }
    message.channel.send("**Leaving...**")
    serverQueue.songs = []
    serverQueue.connection.dispatcher.end()
}

// Dont forget to update help commands after changes
export function help(message) {
    if (!message.member.voice.channel) {
        return message.channel.send("You have to be in a voice channel to do that!")
    }
    const helpMessage = `**Hello ${message.author}!**\n` +
    `My name is ${client.user}. I can play music for you.\n` +
    `To queue a song just type *!play song_url* or *!p song_url*\n` +
    `You can also search by name instead of using an url.\n` +
    `To skip the current song, type *!skip*\n` +
    `To stop the bot, type *!stop*\n` +
    `Type *!commands* to see the list of available commands`
    return message.channel.send(helpMessage)
}

export function commands(message) {
    if (!message.member.voice.channel) {
        return message.channel.send("You have to be in a voice channel to do that!")
    }
    const commandsMessage = `**${client.user} COMMANDS**\n` +
                            `**!play** or **!p**        -> Queue a song\n` +
                            `**!search** or **!queue**  -> Same as play\n` +
                            `**!skip**                  -> Skip current song\n` +
                            `**!next** or **!n**        -> Same as skip\n` +
                            `**!stop** or **!leave**    -> Stop the bot\n` +
                            `**!c** or **!commands**    -> Show all available commands\n` +
                            `**!help** or **h**         -> Show help`
    return message.channel.send(commandsMessage)
}

export async function seixas(message) {
    const args = message.content.split(" ")
    let bomb = "", owner = await client.users.fetch(message.guild.ownerID)
    if (args.length < 2 || isNaN(Number(args[1]))) {
        bomb = `Atende ${owner}\n`
    } else {
        for (let i = 0; i < Number(args[1]); i++) {
            bomb = bomb + `Atende ${owner}\n`
        }
    }
    return message.channel.send(bomb)
}
