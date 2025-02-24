require('dotenv').config(); 
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core'); 
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

let cookies;
try {
    cookies = require('./cookies.js');
} catch (err) {
    console.error('Error al leer el archivo de cookies:', err);
    cookies = [];
}

const agent = ytdl.createAgent(cookies);

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

        try {
            const info = await ytdl.getInfo(songUrl, { agent });

            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
            });

            const stream = ytdl(songUrl, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25, // Tamaño del buffer
                agent
            });

            const player = createAudioPlayer();
            const resource = createAudioResource(stream);

            player.play(resource);
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Idle, () => {
                player.play(silenceResource); // Reproducir silencio al estar inactivo
            });

            player.on('error', (error) => {
                console.error('Error en el AudioPlayer:', error);
                connection.destroy();
                message.channel.send('Hubo un error en la reproducción de audio.');
            });

            message.channel.send(`Reproduciendo: ${info.videoDetails.title}`);
        } catch (error) {
            console.error('Error al reproducir la canción:', error);
            message.channel.send('Hubo un error al intentar reproducir la canción.');
        }
    }
});

// Hacer ping a sí mismo cada 5 minutos para mantener el bot despierto
setInterval(async () => {
    try {
        await fetch(`http://localhost:${port}/ping`);
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