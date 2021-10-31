import * as Discord from 'discord.js'
import * as Command from './commands.js'

// Api and authorization keys
const DISCORD_KEY = process.env.DISCORD_KEY;

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
			name: "!help",
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
		name: "ping",
		description: "Tests the bot"
	});

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

	const { commandName, options } = interaction;

	switch (commandName) {
		case "ping":
			await interaction.reply({ content: "Pong!", fetchReply: true });
			break;
		
		case "play":
			const song = options.getString("song");
			await interaction.reply({ content: song, fetchReply: true });
			Command.execute(interaction, song);
			break;
			
		case "pause":
			console.log("Not implemented yet");
			break;
		
		case "resume":
			console.log("Not implemented yet");
			break;
			
		case "skip":
			console.log("Not implemented yet");
			break;
		
		case "stop":
			console.log("Not implemented yet");
			break;
		
		default:
			console.log("Invalid command!");
			break;
	}
});

client.login(DISCORD_KEY);
