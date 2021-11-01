import { queue } from './index.js';
import ytdl from 'ytdl-core';
import ytsr from 'ytsr';
import ytpl from 'ytpl';
import * as Voice from '@discordjs/voice';

// console.log(Voice.generateDependencyReport());

export async function execute(interaction, song, serverQueue) {

	const voiceChannel = interaction.member.voice.channel;
	if (!voiceChannel) {
		return interaction.channel.send(`**You need to be in a voice channel to play music!**`);
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
		return interaction.channel.send(`**Error when fetching batch:** ${error}`);
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
			return interaction.channel.send(`**Error when joining voice:** ${error}`);
		}
	} else {
		serverQueue.songs.push(...songList);
		return interaction.channel.send(`**${songList[0].title}** has been added to the queue!`);
	}
}

function play(interaction, song) {
	const serverQueue = queue.get(interaction.guild.id);

	if (!song) {
		stop(interaction, serverQueue);
		return;
	}

	// Using opus type to improve performance (inline volume disables this)
	const stream = ytdl(song.url, { filter: "audioonly", quality: "highestaudio" });
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
			return interaction.channel.send(`**Error when playing song:** ${error}`);
		});
	serverQueue.player = player;
	serverQueue.connection.subscribe(player);
	interaction.channel.send(`Started playing: **${song.title}**`);
}

export function pause(interaction, serverQueue) {
	serverQueue.player.pause();
	return interaction.channel.send(`**Paused!**`);
}

export function resume(interaction, serverQueue) {
	serverQueue.player.unpause();
	return interaction.channel.send(`**Resumed!**`);
}

export function skip(interaction, serverQueue) {
	if (!serverQueue) {
		return interaction.channel.send(`**There is no song to skip!**`);
	}
	serverQueue.songs.shift();
	interaction.channel.send(`**Skipping...**`);
	play(interaction, serverQueue.songs[0]);
	return;
}

export function stop(interaction, serverQueue) {
	if (!serverQueue) {
		return interaction.channel.send(`**There is no song to stop!**`);
	}
	interaction.channel.send("**Leaving...**");
	serverQueue.songs = [];
	serverQueue.connection.destroy();
	queue.delete(interaction.guild.id);
	return;
}