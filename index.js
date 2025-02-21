import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } from '@discordjs/voice';
import ytdl from '@distube/ytdl-core';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

const prefix = '!';
const PASSWORD = 'pato';
let botToken = process.env.DISCORD_TOKEN || null; // Token inicial

client.on('ready', () => {
    console.log(`✅ ${client.user.tag} ha iniciado sesión!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content === `${prefix}ping`) {
        return message.channel.send('🏓 Pong!');
    }

    // Comando para cambiar el token
    if (message.content.startsWith(`${prefix}token`)) {
        const args = message.content.split(' ');
        if (args.length < 3) {
            return message.channel.send('⚠️ Uso correcto: `!token <contraseña> <nuevo_token>`');
        }

        const password = args[1];
        const newToken = args[2];

        if (password !== PASSWORD) {
            return message.channel.send('❌ Contraseña incorrecta.');
        }

        botToken = newToken;
        message.channel.send('✅ Token actualizado. Reiniciando bot...');
        await message.delete();
        restartBot();
    }

    // Comando para reproducir música
    if (message.content.startsWith(`${prefix}play`)) {
        const args = message.content.split(' ');
        const songUrl = args[1];

        if (!songUrl || !ytdl.validateURL(songUrl)) {
            return message.channel.send('❌ Proporciona una URL válida de YouTube.');
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
});

// Función para reiniciar el bot con el nuevo token
async function restartBot() {
    console.log('🔄 Reiniciando bot con nuevo token...');
    client.destroy();
    client.login(botToken).catch(err => console.error('❌ Error al iniciar sesión:', err));
}

// Iniciar sesión solo si hay un token
if (botToken) {
    client.login(botToken).catch(err => console.error('❌ Error al iniciar sesión:', err));
} else {
    console.error('❌ No se ha proporcionado un token.');
}
