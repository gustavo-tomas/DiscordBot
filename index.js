import * as Discord from 'discord.js';
import { execute, skip, stop } from './commands.js';
import { Config } from './config.js';

// api and authorization keys (keep same order in config.json)
const prefix = Config.prefix;
const discord_key = Config.discord_key;

const client = new Discord.Client();
export const queue = new Map();

client.once('ready', () => {
    console.log('DiscordBot is Ready!');
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
        message.content.startsWith(`${prefix}p`) ||
        message.content.startsWith(`${prefix}search`)) {
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

client.login(discord_key);