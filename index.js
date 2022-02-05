import * as Discord from 'discord.js'
import * as Command from './commands.js'

// Api and authorization keys
const DISCORD_KEY = process.env.DISCORD_KEY;
const GUILD_ID    = process.env.GUILD_ID;
const OWNER_ID    = process.env.OWNER_ID;

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
		activities: [{
			name: "/ping",
			type: "PLAYING"
		}]
	});

	// Set available commands
	const guild = client.guilds.cache.get(GUILD_ID);
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
	if (!interaction.member.voice.channel) {
		const messageEmbed = new Discord.MessageEmbed()
			.setColor("RED")
			.setTitle("Not In Voice")
			.setDescription("**You need to be in a voice channel to use commands**");
		await interaction.reply("...");
		return interaction.channel.send({ embeds: [messageEmbed] });
	}

	const { commandName, options } = interaction;
	const serverQueue = queue.get(interaction.guild.id);

	switch (commandName) {
		case "ping":
			await interaction.reply("...");
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

// Send message to owner everytime someone leaves or enters a VC
client.on("voiceStateUpdate", (oldState, newState) => {
	client.users.fetch(OWNER_ID).then(user => {
		user.send("Alguém entrou server kkkkk");
	});
});

client.login(DISCORD_KEY);
