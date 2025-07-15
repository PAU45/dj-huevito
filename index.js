require('dotenv').config(); 
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const http = require('http');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

const prefix = '!';
const cache = new Map(); // Mapa para almacenar recursos de audio

// Alternancia de cookies: anónimo, cookies1, cookies2
const cookiesFiles = [null, './cookies1.js', './cookies2.js'];
let cookiesIndex = 0;


// Convierte array de cookies a string para ytdl-core
function getCookieString(cookies) {
    return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}

client.on('ready', () => {
    console.log(`${client.user.tag} ha iniciado sesión!`);
});

const server = http.createServer((req, res) => {
    // Endpoint para ping
    if (req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Pong');
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

const port = process.env.PORT || 10000;

server.listen(port, () => {
    console.log(`Servidor HTTP escuchando en el puerto ${port}`);
});

// Recurso de silencio
const silenceBuffer = Buffer.from([...Array(48000)].map(() => 0)); // 1 segundo de silencio
const silenceResource = createAudioResource(silenceBuffer, { inlineVolume: true });


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

        // Reproducir usando youtube-dl-exec (más estable)
        try {
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            // Crear el stream con youtube-dl-exec y pasar cookies
            const stream = youtubedl(songUrl, {
                output: '-',
                format: 'bestaudio',
                retries: 3,
                socketTimeout: 30,
                cookies: './youtube_cookies.txt' // Archivo de cookies exportado en formato Netscape
            });

            const resource = createAudioResource(stream);
            cache.set(songUrl, resource); // Almacenar en caché

            const player = createAudioPlayer();
            player.play(resource);
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Idle, () => {
                cache.delete(songUrl);
            });

            player.on('error', (error) => {
                console.error('Error en el AudioPlayer:', error);
                message.channel.send('Hubo un error en la reproducción de audio. Intentando continuar...');
            });

            message.channel.send(`Reproduciendo: ${songUrl}`);
        } catch (error) {
            console.error('Error al reproducir la canción:', error);
            message.channel.send('Hubo un error al intentar reproducir la canción.');
        }
    }
});



setInterval(async () => {
    try {
        const response = await fetch(`https://dj-huevito.onrender.com/ping`, { timeout: 20000 }); // 20 segundos de timeout
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        console.log('Manteniendo bot despierto...');
    } catch (error) {
        console.error('Error al hacer ping:', error);
    }
}, 300000); // 300000 ms = 5 minutos

client.on('disconnect', () => {
    console.log('Bot desconectado. Intentando reconectar...');
    client.login(process.env.DISCORD_TOKEN); // Reemplaza con tu token
});

// Iniciar sesión en Discord
client.login(process.env.DISCORD_TOKEN);