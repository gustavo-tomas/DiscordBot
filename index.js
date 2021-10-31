import * as Discord from 'discord.js'
import { commands, execute, help, skip, stop, seixas, pause } from './commands.js'

// Api and authorization keys
const PREFIX      = process.env.PREFIX;
const DISCORD_KEY = process.env.DISCORD_KEY;

// Current voice channel and ID
let voiceChannel, voiceChannelID;

export const client = new Discord.Client();
export const queue  = new Map();

client.login(DISCORD_KEY);

// Set bot username and status on startup
client.once('ready', () => {
    console.log('DiscordBot is Ready!');
    client.user.setUsername("DJ BALA");
    client.user.setPresence({
        status: 'online',
        activity: {
            name: "!help",
            type: "PLAYING"
        }
    });
});
client.once('reconnecting', () => {
    console.log('DiscordBot is Reconnecting!');
})
client.once('disconnect', () => {
    console.log('DiscordBot Disconnected!');
})

// Read messages
client.on('message', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;
    
    // Updates current voice channel and channelID
    voiceChannel   = message.member.voice.channel;
    voiceChannelID = message.member.voice.channelID;

    // Gets music queue and switch bot command
    const serverQueue = queue.get(message.guild.id);
    const command = message.content.split(" ")[0].toLowerCase();
    switch (command) {
        case `${PREFIX}play`:  case `${PREFIX}search`: case `${PREFIX}p`:
        case `${PREFIX}queue`: case `${PREFIX}stream`:
            execute(message, serverQueue);
            break;
        
        case `${PREFIX}skip`: case `${PREFIX}next`: case `${PREFIX}n`:
            skip(message, serverQueue);
            break;
        
        case `${PREFIX}stop`: case `${PREFIX}leave`:
            stop(message, serverQueue);
            break;
        
        case `${PREFIX}help`: case `${PREFIX}h`:
            help(message);
            break;
        
        case `${PREFIX}commands`: case `${PREFIX}c`:
            commands(message);
            break;
        
        case `${PREFIX}pause`: case `${PREFIX}resume`:
            pause(message, serverQueue, command.split("!")[1]);
            break;
        
        case `${PREFIX}seixas`:
            seixas(message);
            break;
    
        default:
            message.channel.send("Invalid command!");
            break;
    }
})

// Checks if there are users in curr channel and leaves otherwise
client.on("voiceStateUpdate", (oldMember, newMember) => {
    if (!voiceChannelID) return;
    const membersInVoice = voiceChannel.members.array().length;
    if (newMember.channelID != oldMember.channelID &&
        oldMember.channelID == voiceChannelID) {
        const serverQueue = queue.get(voiceChannel.guild.id);
        if (serverQueue && membersInVoice <= 1) {
            serverQueue.voiceChannel.leave();
            queue.delete(voiceChannel.guild.id);
            voiceChannel = null;
            voiceChannelID = null;
        }
    }
})
