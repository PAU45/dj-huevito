require('dotenv').config(); 
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
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

        // Alternar entre anónimo, cookies1, cookies2
        let info = null;
        let lastError = null;
        let usedCookieString = null;
        for (let i = 0; i < cookiesFiles.length; i++) {
            try {
                let cookieString = null;
                let tieneIdentityToken = false;
                if (cookiesFiles[i] !== null) {
                    const cookies = require(cookiesFiles[i]);
                    cookieString = getCookieString(cookies);
                    tieneIdentityToken = cookies.some(c => c.name === 'YOUTUBE_IDENTITY_TOKEN');
                }
                // Solo usar cookies si tienen YOUTUBE_IDENTITY_TOKEN
                if (cookieString && tieneIdentityToken) {
                    info = await ytdl.getInfo(songUrl, { requestOptions: { headers: { cookie: cookieString } } });
                    usedCookieString = cookieString;
                    message.channel.send(`Reproduciendo usando cookies${i}.`);
                    break;
                } else if (i === 0) {
                    // Primer intento: modo anónimo
                    info = await ytdl.getInfo(songUrl, {});
                    usedCookieString = null;
                    message.channel.send('Reproduciendo en modo anónimo.');
                    break;
                }
            } catch (err) {
                lastError = err;
                // Si es el último intento, reporta el error
                if (i === cookiesFiles.length - 1) {
                    console.error('Error al reproducir la canción:', err);
                    if (String(err).includes('identity token')) {
                        return message.channel.send('No se puede reproducir este video porque requiere autenticación especial de YouTube.');
                    }
                    return message.channel.send('Hubo un error al intentar reproducir la canción.');
                }
            }
        }

        // Verificar si se obtuvo info del video
        if (!info || !info.videoDetails) {
            console.error('No se pudo obtener información del video.');
            return message.channel.send('No se pudo obtener información del video. Es posible que el video esté borrado, privado o bloqueado.');
        }

        try {
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            // Verificar si el recurso está en el caché
            let resource;
            if (cache.has(songUrl)) {
                console.log(`Usando recurso de caché para: ${info.videoDetails.title}`);
                resource = cache.get(songUrl);
            } else {
                const stream = ytdl(songUrl, {
                    filter: 'audioonly',
                    quality: 'highestaudio',
                    highWaterMark: 1 << 25, // Tamaño del buffer
                    ...(usedCookieString ? { requestOptions: { headers: { cookie: usedCookieString } } } : {})
                });
                resource = createAudioResource(stream);
                cache.set(songUrl, resource); // Almacenar en caché
            }

            const player = createAudioPlayer();
            player.play(resource);
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Idle, () => {
                // ...tu lógica de siguiente canción o silencio...
                cache.delete(songUrl);
            });

            player.on('error', (error) => {
                console.error('Error en el AudioPlayer:', error);
                message.channel.send('Hubo un error en la reproducción de audio. Intentando continuar...');
                // ...tu lógica de siguiente canción o silencio...
            });

            message.channel.send(`Reproduciendo: ${info.videoDetails.title}`);
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