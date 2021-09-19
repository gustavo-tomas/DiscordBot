import * as Discord from 'discord.js';
import { commands, execute, help, skip, stop } from './commands.js';

// Api and authorization keys
const PREFIX = process.env.PREFIX;
const DISCORD_KEY = process.env.DISCORD_KEY;

// Current voice channel and ID
let voiceChannel, voiceChannelID;

export const client = new Discord.Client();
export const queue = new Map();

client.login(DISCORD_KEY);

client.once('ready', () => {
    console.log('DiscordBot is Ready!');
});
client.once('reconnecting', () => {
    console.log('DiscordBot is Reconnecting!');
});
client.once('disconnect', () => {
    console.log('DiscordBot Disconnected!');
});

// Read messages
client.on('message', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;
    
    // Updates current voice channel and channelID
    voiceChannel   = message.member.voice.channel;
    voiceChannelID = message.member.voice.channelID;

    // Music queue
    const serverQueue = queue.get(message.guild.id);

    // Bot commands
    if (message.content.startsWith(`${PREFIX}play`)   ||
        message.content.startsWith(`${PREFIX}p`)      ||
        message.content.startsWith(`${PREFIX}search`) ||
        message.content.startsWith(`${PREFIX}queue`)) {
        execute(message, serverQueue);
        return;
    }
    else if (message.content.startsWith(`${PREFIX}skip`) ||
            message.content.startsWith(`${PREFIX}next`)  ||
            message.content.startsWith(`${PREFIX}n`)) {
        skip(message, serverQueue);
        return;
    }
    else if (message.content.startsWith(`${PREFIX}stop`) ||
            message.content.startsWith(`${PREFIX}leave`)) {
        stop(message, serverQueue);
        return;
    }
    else if (message.content.startsWith(`${PREFIX}help`) ||
            message.content.startsWith(`${PREFIX}h`)) {
        help(message);
        return;
    }
    else if (message.content.startsWith(`${PREFIX}commands`) ||
            message.content.startsWith(`${PREFIX}c`)) {
        commands(message);
        return;
    }
    else {
        message.channel.send("Invalid command!");
    }
})

// Checks if there are users in curr channel and leaves otherwise
client.on("voiceStateUpdate", (oldMember, newMember) => {
    if (!voiceChannelID) return;
    if (oldMember.channelID != newMember.channelID && oldMember.channelID == voiceChannelID) {
        const serverQueue = queue.get(voiceChannel.guild.id);
        if (serverQueue) {
            serverQueue.voiceChannel.leave();
            queue.delete(voiceChannel.guild.id);
        }
        voiceChannel = null;
        voiceChannelID = null;
    }
});