import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } from '@discordjs/voice';
import ytdl from '@distube/ytdl-core';
import fs from 'fs';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

const prefix = '!';
const PASSWORD = 'mi_contraseña_segura';

client.on('ready', () => {
    console.log(`${client.user.tag} ha iniciado sesión!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === `${prefix}ping`) {
        message.channel.send('🏓 Pong!');
    }

    if (message.content.startsWith(`${prefix}play`)) {
        const args = message.content.split(' ');
        const songUrl = args[1];

        if (!songUrl) {
            return message.channel.send('❌ Por favor, proporciona una URL válida de YouTube.');
        }

        const channel = message.member.voice.channel;
        if (!channel) {
            return message.channel.send('⚠️ ¡Debes unirte a un canal de voz primero!');
        }

        try {
            const player = createAudioPlayer();
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            connection.on(VoiceConnectionStatus.Ready, () => {
                console.log('🔊 Conectado al canal de voz!');
            });

            console.log('🎵 Obteniendo stream de audio...');
            const stream = ytdl(songUrl, { filter: 'audioonly', quality: 'highestaudio' });
            const resource = createAudioResource(stream);

            player.play(resource);
            connection.subscribe(player);

            message.channel.send(`🎶 Reproduciendo: ${songUrl}`);

            player.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
            });

            player.on('error', (error) => {
                console.error('❌ Error en el reproductor de audio:', error);
                message.channel.send('❌ Hubo un error al reproducir la canción.');
                connection.destroy();
            });

        } catch (error) {
            console.error('❌ Error al reproducir la canción:', error);
            message.channel.send('❌ Hubo un error al intentar reproducir la canción.');
        }
    }

    if (message.content.startsWith(`${prefix}token`)) {
        const args = message.content.split(' ');
        if (args.length < 3) {
            return message.channel.send('⚠️ Uso correcto: `!token CONTRASEÑA NUEVO_TOKEN`');
        }

        const password = args[1];
        const newToken = args[2];

        if (password !== PASSWORD) {
            return message.channel.send('❌ Contraseña incorrecta.');
        }

        fs.writeFileSync('.env', `DISCORD_TOKEN=${newToken}\n`);
        message.channel.send('✅ Token actualizado con éxito. Reiniciando bot...');
        await message.delete();
        process.exit(1);
    }
});

client.login(process.env.DISCORD_TOKEN);