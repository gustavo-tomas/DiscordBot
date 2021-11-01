import { MessageEmbed } from 'discord.js';
import { queue } from './index.js';
import ytdl from 'ytdl-core';
import ytsr from 'ytsr';
import ytpl from 'ytpl';
import * as Voice from '@discordjs/voice';

// console.log(Voice.generateDependencyReport());

// TODO: MAKE EMBEDS DRYER (including errors)
function createEmbed(color, title, description) {
	const messageEmbed = new MessageEmbed()
		.setColor(color)
		.setTitle(title)
		.setDescription(description)
	return messageEmbed;
}

export async function execute(interaction, song, serverQueue) {

	const voiceChannel = interaction.member.voice.channel;
	if (!voiceChannel) {
		const message = "**You need to be in a voice channel to play music!**";
		const messageEmbed = createEmbed("RED", "\:sound: Not in voice", message);
		return interaction.channel.send({ embeds: [messageEmbed] });
	}

	// Expression matches a playlist and stream
	const plExpression  = new RegExp(/list=/);
	
	// SongList is an array of type {title: , url: }
	let videoTitle, videoUrl, songList = [];

	/**
	 * See if this can be DRYed
	 */
	try {
		// If url is a video and not a playlist
		if (ytdl.validateURL(song) && !(song.match(plExpression))) {
				const details = (await ytdl.getInfo(song)).videoDetails;
				songList.push({ title: details.title, url: details.video_url });
		}
		// Else if url is a playlist 
		else if (song.match(plExpression)) {
				const batch = (await ytpl(song, { limit: 15 })).items;
				batch.forEach((item) => songList.push({ title: item.title, url: item.url }));
		}
		// Else treat the message as a search query with search results limited to 5
		else {
				const batch = await ytsr(song, { limit: 5 });
				const filteredBatch = batch.items.filter(video => video.type === 'video');
				videoTitle = filteredBatch[0].title;
				videoUrl   = filteredBatch[0].url;
				songList.push({title: videoTitle, url: videoUrl});
		}
	} catch (error) {
		console.error("Error when fetching batch: ", error);
		const messageEmbed = createEmbed("RED", "\:exclamation: Error", error);
		return interaction.channel.send({ embeds: [messageEmbed] });
	}

	// Checks if song is playing
	if (!serverQueue) {
		// Creating the contract for queue
		const queueContruct = {
			voiceChannel: voiceChannel,
			connection: null,
			player: null,
			songs: []
		}

		// Setting the queue using our contract
		queue.set(interaction.guild.id, queueContruct);
		
		// Pushing the song to our songs array
		queueContruct.songs.push(...songList);
		
		try {
			// Here we try to join the voicechat and save our connection into our object.
			var connection = Voice.joinVoiceChannel({
				channelId: voiceChannel.id,
				guildId: interaction.guild.id,
				adapterCreator: interaction.guild.voiceAdapterCreator
			});
			queueContruct.connection = connection;

			// Calling the play function to start a song
			play(interaction, queueContruct.songs[0]);
		} catch (error) {
			// Printing the error message if the bot fails to join the voicechat
			console.error("Error when joining voice: ", error);
			queue.delete(interaction.guild.id);
			const messageEmbed = createEmbed("RED", "\:exclamation: Error", error);
			return interaction.channel.send({ embeds: [messageEmbed] });
		}
	} else {
		serverQueue.songs.push(...songList);
		const messageEmbed = createEmbed("BLUE", "\:musical_note: Queued", `**${songList[0].title}**`);
		return interaction.channel.send({ embeds: [messageEmbed] });
	}
}

function play(interaction, song) {
	const serverQueue = queue.get(interaction.guild.id);

	if (!song) {
		stop(interaction, serverQueue);
		return;
	}

	// Using opus type to improve performance (inline volume disables this)
	const stream = ytdl(song.url, { filter: "audioonly" });
	const resource = Voice.createAudioResource(stream, { inputType: Voice.StreamType.WebmOpus });
	const player = Voice.createAudioPlayer();
	player.play(resource);
	player
		.on(Voice.AudioPlayerStatus.Idle, () => {
			serverQueue.songs.shift();
			play(interaction, serverQueue.songs[0]);
		})
		.on("error", error => {
			console.error(`Error when playing song: ${error}`);
			const messageEmbed = createEmbed("RED", "\:exclamation: Error", error);
			return interaction.channel.send({ embeds: [messageEmbed] });
		});
	serverQueue.player = player;
	serverQueue.connection.subscribe(player);
	const messageEmbed = createEmbed("GREEN", "\:notes: Started Playing", `**${song.title}**`);
	return interaction.channel.send({ embeds: [messageEmbed] });
}

export function pause(interaction, serverQueue) {
	if (!serverQueue) {
		const messageEmbed = createEmbed("RED", "\:grey_exclamation: Error", `**There is no song to pause!**`);
		return interaction.channel.send({ embeds: [messageEmbed] });
	}
	serverQueue.player.pause();
	const messageEmbed = createEmbed("PURPLE", "\:play_pause: Paused", `**Music has been paused**`);
	return interaction.channel.send({ embeds: [messageEmbed] });
}

export function resume(interaction, serverQueue) {
	if (!serverQueue) {
		const messageEmbed = createEmbed("RED", "\:grey_exclamation: Error", `**There is no song to resume!**`);
		return interaction.channel.send({ embeds: [messageEmbed] });
	}
	serverQueue.player.unpause();
	const messageEmbed = createEmbed("PURPLE", "\:play_pause: Resumed", `**Music has been resumed**`);
	return interaction.channel.send({ embeds: [messageEmbed] });
}

export function skip(interaction, serverQueue) {
	if (!serverQueue) {
		const messageEmbed = createEmbed("RED", "\:grey_exclamation: Error", `**There is no song to skip!**`);
		return interaction.channel.send({ embeds: [messageEmbed] });
	}
	serverQueue.songs.shift();
	const messageEmbed = createEmbed("BLUE", "\:fast_forward: Skipping", `**Skipping song...**`);
	interaction.channel.send({ embeds: [messageEmbed] });
	play(interaction, serverQueue.songs[0]);
	return;
}

export function stop(interaction, serverQueue) {
	if (!serverQueue) {
		const messageEmbed = createEmbed("RED", "\:grey_exclamation: Error", `**There is no song to stop!**`);
		return interaction.channel.send({ embeds: [messageEmbed] });
	}
	serverQueue.songs = [];
	serverQueue.connection.destroy();
	queue.delete(interaction.guild.id);
	const messageEmbed = createEmbed("YELLOW", "\:octagonal_sign: Leaving", `**Leaving voice**`);
	return interaction.channel.send({ embeds: [messageEmbed] });
}

export function ping(interaction, client) {
	const latency = `Latency is **${Date.now() - interaction.createdTimestamp}ms.\n` +
	`**API Latency is **${Math.round(client.ws.ping)}ms**`;
	const messageEmbed = createEmbed("AQUA", "\:ping_pong: Ping Result", latency);
	return interaction.channel.send({ embeds: [messageEmbed] });
}