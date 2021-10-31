import ytdl from 'ytdl-core';
import * as Voice from '@discordjs/voice';

console.log(Voice.generateDependencyReport());

export async function execute(interaction, song) {

	const voiceChannel = interaction.member.voice.channel;
	const connection = Voice.joinVoiceChannel({
		channelId: voiceChannel.id,
		guildId: interaction.guild.id,
		adapterCreator: interaction.guild.voiceAdapterCreator
	});

	const stream = ytdl(song, { filter: "audioonly", quality: "highestaudio" });
	const resource = Voice.createAudioResource(stream, { inputType: Voice.StreamType.Arbitrary });
	const player = Voice.createAudioPlayer();
	player.play(resource);
	connection.subscribe(player);
	player.on(Voice.AudioPlayerStatus.Idle, () => connection.destroy());
}
