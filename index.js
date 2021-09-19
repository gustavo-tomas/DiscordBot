import * as Discord from 'discord.js';
import { commands, execute, help, skip, stop, seixas } from './commands.js';

// Api and authorization keys
const PREFIX = process.env.PREFIX;
const DISCORD_KEY = process.env.DISCORD_KEY;

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
    else if (message.content.startsWith(`${PREFIX}seixas`)) {
        seixas(message);
        return;
    }
    else {
        message.channel.send("Invalid command!");
    }
})
