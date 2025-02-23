require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus
} = require('@discordjs/voice');
const { exec } = require("youtube-dl-exec");
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

const prefix = '!';
let connection;  // Mantener la conexión para evitar múltiples instancias

// Función para obtener cookies desde la variable de entorno
function getCookies() {
    try {
        return JSON.parse(process.env.YTDL_COOKIES || "{}");
    } catch (error) {
        console.error("❌ Error al parsear las cookies:", error);
        return {};
    }
}

client.on('ready', () => {
    console.log(`${client.user.tag} has logged in!`);
});

client.on('messageCreate', async (message) => {
    console.log(`Mensaje recibido: ${message.content}`);

    if (message.author.bot) return;

    if (message.content === `${prefix}ping`) {
        console.log('Comando !ping recibido');
        return message.channel.send('Pong!');
    }

    if (message.content.startsWith(`${prefix}play`)) {
        console.log('Comando !play recibido');
        const args = message.content.split(' ');
        const songUrl = args[1];

        if (!songUrl) {
            console.log('URL no válida');
            return message.channel.send('❌ Por favor, proporciona una URL válida de YouTube.');
        }

        const channel = message.member.voice.channel;
        if (!channel) {
            console.log('El usuario no está en un canal de voz');
            return message.channel.send('⚠️ ¡Debes estar en un canal de voz para usar este comando!');
        }

        try {
            // Verificar si ya hay una conexión activa
            if (!connection || connection.state.status === VoiceConnectionStatus.Destroyed) {
                connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: message.guild.id,
                    adapterCreator: message.guild.voiceAdapterCreator,
                    selfDeaf: false,
                });

                connection.on(VoiceConnectionStatus.Ready, () => {
                    console.log('✅ Conectado al canal de voz');
                });

                connection.on('error', (err) => {
                    console.error('❌ Error en la conexión de voz:', err);
                });
            }

            // Configuración de yt-dlp
            const stream = exec(songUrl, {
                output: "-",
                format: "bestaudio[ext=webm]",
                limitRate: "100K", // Evita detección como bot
                cookies: JSON.stringify(getCookies()) // Usa cookies en JSON
            });

            const resource = createAudioResource(stream);
            const player = createAudioPlayer();

            player.play(resource);
            connection.subscribe(player);

            // Manejo de eventos del reproductor
            player.on(AudioPlayerStatus.Idle, () => {
                console.log('🎵 Reproducción terminada.');
            });

            player.on('error', (error) => {
                console.error('❌ Error en el reproductor de audio:', error);
                message.channel.send('❌ Hubo un error al reproducir la canción.');
            });

            message.channel.send(`🎶 Reproduciendo: **${songUrl}**`);
        } catch (error) {
            console.error('❌ Error al reproducir la canción:', error);
            message.channel.send('❌ Hubo un error al intentar reproducir la canción.');
        }
    }

    if (message.content === `${prefix}leave`) {
        if (connection) {
            connection.destroy();
            connection = null;
            message.channel.send('👋 El bot ha salido del canal de voz.');
        } else {
            message.channel.send('⚠️ No estoy en un canal de voz.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
