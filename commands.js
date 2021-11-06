import { MessageEmbed } from 'discord.js';
import { queue } from './index.js';
import ytdl from 'ytdl-core';
import ytsr from 'ytsr';
import ytpl from 'ytpl';
import * as Voice from '@discordjs/voice';

/**
 * Creates an embed and sends to an interaction with provided color, title and description
 * @param {Discord.Interaction} interaction The interaction to send messages
 * @param {string} color The color of the border of the embed
 * @param {string} title The title of the embed
 * @param {string} description The text of the embed
 */
function createEmbed(interaction, color, title, description) {
	const messageEmbed = new MessageEmbed()
		.setColor(color)
		.setTitle(title)
		.setDescription(description)
	interaction.channel.send({ embeds: [messageEmbed] });
}

/**
 * Sends a message and error to console and embed
 * @param {Discord.Interaction} interaction The interaction to send messages
 * @param {string} message The description of the error
 * @param {object} error Generated error object 
 */
function sendEmbedError(interaction, message, error) {
	console.error(message, error);
	createEmbed(interaction, "RED", "\:exclamation: Error", error.toString());
}

/**
 * Handles song queue and connections
 * @param {Discord.Interaction} interaction the interaction that used commands
 * @param {string} song The url/name provided
 * @param {object} serverQueue Queue of the current player
 * @returns 
 */
export async function execute(interaction, song, serverQueue) {

	const voiceChannel = interaction.member.voice.channel;

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
		return sendEmbedError(interaction, "Error when fetching batch: ", error);
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
			queue.delete(interaction.guild.id);
			return sendEmbedError(interaction, "Error when joining voice: ", error);
		}
	} else {
		serverQueue.songs.push(...songList);
		return createEmbed(interaction, "BLUE", "\:musical_note: Queued", `**${songList[0].title}**`);
	}
}

/**
 * Plays all songs in the queue
 * @param {Discord.Interaction} interaction The interaction that called play
 * @param {object} song Song to be played
 * @returns 
 */
function play(interaction, song) {
	const serverQueue = queue.get(interaction.guild.id);

	if (!song) {
		stop(interaction, serverQueue);
		return;
	}

	// Using opus type to improve performance (inline volume disables this)
	const stream = ytdl(song.url, { filter: "audioonly" });
	const resource = Voice.createAudioResource(stream, { inputType: Voice.StreamType.Arbitrary });
	const player = Voice.createAudioPlayer();
	player.play(resource);
	player
		.on(Voice.AudioPlayerStatus.Idle, () => {
			serverQueue.songs.shift();
			play(interaction, serverQueue.songs[0]);
		})
		.on("error", error => {
			return sendEmbedError(interaction, "Error when playing song: ", error);
		});
	serverQueue.player = player;
	serverQueue.connection.subscribe(player);
	return createEmbed(interaction, "GREEN", "\:notes: Started Playing", `**${song.title}**`);
}

/**
 * Pauses song if it is playing
 * @param {Discord.Interaction} interaction The interaction that called pause
 * @param {object} serverQueue The current queue
 * @returns 
 */
export function pause(interaction, serverQueue) {
	if (!serverQueue) {
		return createEmbed(interaction, "RED", "\:grey_exclamation: Error", `**There is no song to pause!**`);
	}
	serverQueue.player.pause();
	return createEmbed(interaction, "PURPLE", "\:play_pause: Paused", `**Music has been paused**`);
}

/**
 * Resumes a paused song
 * @param {Discord.Interaction} interaction The interaction that called resume
 * @param {object} serverQueue The current queue
 * @returns 
 */
export function resume(interaction, serverQueue) {
	if (!serverQueue) {
		return createEmbed(interaction, "RED", "\:grey_exclamation: Error", `**There is no song to resume!**`);
	}
	serverQueue.player.unpause();
	return createEmbed(interaction, "PURPLE", "\:play_pause: Resumed", `**Music has been resumed**`);
}

/**
 * Skips current song if queue is not empty
 * @param {Discord.Interaction} interaction The interaction that called skip
 * @param {object} serverQueue The current queue
 * @returns 
 */
export function skip(interaction, serverQueue) {
	if (!serverQueue) {
		return createEmbed(interaction, "RED", "\:grey_exclamation: Error", `**There is no song to skip!**`);
	}
	serverQueue.songs.shift();
	createEmbed(interaction, "BLUE", "\:fast_forward: Skipping", `**Skipping song...**`);
	play(interaction, serverQueue.songs[0]);
	return;
}

/**
 * Stops bot and quits voice
 * @param {Discord.Interaction} interaction The interaction that called stop
 * @param {object} serverQueue The current music queue
 * @returns 
 */
export function stop(interaction, serverQueue) {
	if (!serverQueue) {
		return createEmbed(interaction, "RED", "\:grey_exclamation: Error", `**There is no song to stop!**`);
	}
	serverQueue.songs = [];
	serverQueue.connection.destroy();
	queue.delete(interaction.guild.id);
	return createEmbed(interaction, "YELLOW", "\:octagonal_sign: Leaving", `**Leaving voice**`);
}

/**
 * Shows bot latency
 * @param {Discord.Interaction} interaction The interaction that called ping
 * @param {Discord.Client} client The bot client
 * @returns 
 */
export function ping(interaction, client) {
	const latency = `Latency is **${Date.now() - interaction.createdTimestamp}ms.\n` +
	`**API Latency is **${Math.round(client.ws.ping)}ms**`;
	return createEmbed(interaction, "AQUA", "\:ping_pong: Ping Result", latency);
}