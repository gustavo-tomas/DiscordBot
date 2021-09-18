import * as Discord from 'discord.js';
import { commands, execute, help, skip, stop } from './commands.js';
import { Config } from './config.js';

// Api and authorization keys
const PREFIX = Config.PREFIX;
const DISCORD_KEY = Config.DISCORD_KEY;

export const client = new Discord.Client();
export const queue = new Map();

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

client.login(DISCORD_KEY);