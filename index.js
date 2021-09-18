import * as Discord from 'discord.js';
import { commands, execute, help, skip, stop } from './commands.js';

// Api and authorization keys
const PREFIX = process.env.PREFIX;
const DISCORD_KEY = process.env.DISCORD_KEY;

export const client = new Discord.Client();
export const queue = new Map();

// Number of current users in a voice chat
let globalMessageGuild;

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
    
    // Music queue
    const serverQueue = queue.get(message.guild.id);
    globalMessageGuild = message.guild;

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

// voiceStateUpdate
/* Emitted whenever a user changes voice state - e.g. joins/leaves a channel, mutes/unmutes.
PARAMETER    TYPE             DESCRIPTION
oldMember    GuildMember      The member before the voice state update
newMember    GuildMember      The member after the voice state update    */
client.on("voiceStateUpdate", (oldMember, newMember) => {
    if (newMember != oldMember &&
        newMember.channelID == null) {
        // console.log("QUEUE = ", queue);
        // console.log("GMG = ", globalMessageGuild);
        if (globalMessageGuild != null) {
            queue.get(globalMessageGuild.id).voiceChannel.leave();
            queue.delete(globalMessageGuild.id);
        }
    }
});

client.login(DISCORD_KEY);