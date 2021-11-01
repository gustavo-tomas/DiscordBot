import * as Discord from 'discord.js'
import * as Command from './commands.js'

// Api and authorization keys
const DISCORD_KEY = process.env.DISCORD_KEY;
let voiceChannel;

export const client = new Discord.Client({
	intents: [
		Discord.Intents.FLAGS.GUILDS,
		Discord.Intents.FLAGS.GUILD_MESSAGES,
		Discord.Intents.FLAGS.GUILD_VOICE_STATES
	]
});
export const queue  = new Map();

client.once('ready', () => {
	// Set bot username and status on startup
	console.log('DiscordBot is Ready!');
	client.user.setUsername("DJ BALA");
	client.user.setPresence({
		status: 'online',
		activity: {
			name: "/ping",
			type: "PLAYING"
		}
	});

	// Set available commands
	const guildId = "445060828874670091";
	const guild = client.guilds.cache.get(guildId);
	let commands;

	if (guild) {
		commands = guild.commands;
	} else {
		commands = client.application.commands;
	}

	commands.create({
		name: "play",
		description: "Plays or Queues a song",
		options: [{
			name: "song",
			description: "Song name or url",
			required: true,
			type: Discord.Constants.ApplicationCommandOptionTypes.STRING
		}]
	});

	commands.create({
		name: "pause",
		description: "Pauses current song"
	});

	commands.create({
		name: "resume",
		description: "Resumes current song"
	});

	commands.create({
		name: "skip",
		description: "Skips current song"
	});

	commands.create({
		name: "stop",
		description: "Stops the bot"
	});

	commands.create({
		name: "ping",
		description: "Tests the bots latency"
	});
});

client.once('reconnecting', () => {
	console.log('DiscordBot is Reconnecting!');
});

client.once('disconnect', () => {
	console.log('DiscordBot Disconnected!');
});

// Read messages
client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	voiceChannel = interaction.member.voice.channel;

	const { commandName, options } = interaction;
	const serverQueue = queue.get(interaction.guild.id);

	switch (commandName) {
		case "ping":
			await interaction.reply("...");
			await 
			Command.ping(interaction, client);
			break;
		
		case "play":
			const song = options.getString("song");
			await interaction.reply({ content: "...", fetchReply: true });
			Command.execute(interaction, song, serverQueue);
			break;
			
		case "pause":
			await interaction.reply("...");
			Command.pause(interaction, serverQueue);
			break;
		
		case "resume":
			await interaction.reply("...");
			Command.resume(interaction, serverQueue);
			break;
			
		case "skip":
			await interaction.reply("...");
			Command.skip(interaction, serverQueue);
			break;
		
		case "stop":
			await interaction.reply("...");
			Command.stop(interaction, serverQueue);
			break;
		
		default:
			console.log("Invalid command!");
			break;
	}
});

// Checks if there are users in curr channel and leaves otherwise
// client.on("voiceStateUpdate", () => {
// 	if (!voiceChannel) return;
// 	console.log(Object.keys(voiceChannel.members).length);
// 	if (Object.keys(voiceChannel.members).length <= 1) {
// 		console.log("EMPTY!");
// 		// const serverQueue = queue.get(voiceChannel.guild.id);
// 		// serverQueue.connection.destroy();
// 		queue.delete(voiceChannel.guild.id);
// 	} else {
// 		console.log("NOT EMPTY!");
// 	}
// });

client.login(DISCORD_KEY);
