require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core'); 
const fetch = require('node-fetch'); // Importa la biblioteca fetch
const ffmpeg = require('ffmpeg-static');
const fs = require('fs'); // Importa el módulo fs

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

const prefix = '!';

// Leer las cookies desde el archivo cookies.txt
let cookieString;
try {
    cookieString = fs.readFileSync('cookies.txt', 'utf8').trim();
} catch (err) {
    console.error('Error al leer el archivo de cookies:', err);
    cookieString = ''; // Si hay un error, inicializa como cadena vacía
}

client.on('ready', () => {
    console.log(`${client.user.tag} ha iniciado sesión!`);
});

client.on('messageCreate', async (message) => {
    console.log(`Mensaje recibido: ${message.content}`);

    if (message.author.bot) return;

    if (message.content === `${prefix}ping`) {
        console.log('Comando !ping recibido');
        message.channel.send('¡Pong!');
    }

    if (message.content.startsWith(`${prefix}play`)) {
        console.log('Comando !play recibido');
        const args = message.content.split(' ');
        const songUrl = args[1];

        if (!songUrl) {
            console.log('URL no proporcionada');
            return message.channel.send('Por favor, proporciona una URL válida de YouTube.');
        }

        const channel = message.member.voice.channel;
        if (!channel) {
            console.log('El usuario no está en un canal de voz');
            return message.channel.send('¡Necesitas unirte a un canal de voz primero!');
        }

        try {
            // Validar la URL y obtener información del video
            const info = await ytdl.getInfo(songUrl, {
                requestOptions: {
                    headers: {
                        'Cookie': cookieString // Agrega las cookies a tu solicitud
                    }
                }
            });
            if (!info) {
                return message.channel.send('No se pudo obtener información del video.');
            }

            // Conectar al canal de voz
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            connection.on(VoiceConnectionStatus.Ready, () => {
                console.log('El bot se ha conectado al canal de voz!');
            });

            // Crear el stream de audio con ytdl-core
            const stream = ytdl(songUrl, { filter: 'audioonly', quality: 'highestaudio' });
            const resource = createAudioResource(stream);

            const player = createAudioPlayer();
            player.play(resource);
            connection.subscribe(player);

            // Manejar eventos del reproductor
            player.on(AudioPlayerStatus.Idle, () => {
                console.log('El bot se ha desconectado del canal de voz.');
                connection.destroy();
            });

            player.on('error', (error) => {
                console.error('Error en el reproductor de audio:', error);
                message.channel.send('Hubo un error al reproducir la canción.');
                connection.destroy();
            });

            message.channel.send(`Reproduciendo: ${info.videoDetails.title}`);
        } catch (error) {
            console.error('Error al reproducir la canción:', error);
            message.channel.send('Hubo un error al intentar reproducir la canción.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);