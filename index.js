import dotenv from 'dotenv';
dotenv.config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core'); 
const fs = require('fs');
const http = require('http'); // Importa el módulo http

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

// Crear un servidor HTTP para evitar advertencias sobre puertos
const server = http.createServer();
const port = process.env.PORT || 10000; // Usa el puerto de la variable de entorno o 10000 como predeterminado

server.listen(port, () => {
    console.log(`Servidor HTTP escuchando en el puerto ${port}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (message.content.startsWith(`${prefix}play`)) {
        const args = message.content.split(' ');
        const songUrl = args[1];

        if (!songUrl) {
            return message.channel.send('Por favor, proporciona una URL válida de YouTube.');
        }

        const channel = message.member.voice.channel;
        if (!channel) {
            return message.channel.send('¡Necesitas unirte a un canal de voz primero!');
        }

        try {
            const info = await ytdl.getInfo(songUrl, {
                requestOptions: {
                    headers: {
                        'Cookie': cookieString
                    }
                }
            });

            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            const stream = ytdl(songUrl, { filter: 'audioonly', quality: 'highestaudio' });
            const resource = createAudioResource(stream);
            const player = createAudioPlayer();

            player.play(resource);
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Idle, () => {
                connection.destroy();
            });

            player.on('error', (error) => {
                console.error('Error en el reproductor de audio:', error);
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