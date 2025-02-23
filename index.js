const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');
const fs = require('fs');
const { exec } = require("youtube-dl-exec");

// Configuración inicial del cliente de Discord
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent],
});

const prefix = '!'; // Prefijo del comando
let connection = null; // Variable global para la conexión de voz

// Guardar cookies en un archivo cookies.txt
function saveCookiesToFile() {
    try {
        const cookieData = JSON.parse(process.env.YTDL_COOKIES || "{}");
        if (!cookieData.cookies) return;

        // Crear el formato adecuado de cookies para yt-dlp
        const cookieString = cookieData.cookies.map(cookie =>
            `${cookie.domain}\tTRUE\t/\tTRUE\t2147483647\t${cookie.name}\t${cookie.value}`
        ).join("\n");

        // Guardar las cookies en el archivo cookies.txt
        fs.writeFileSync("cookies.txt", cookieString);
        console.log("✅ Cookies guardadas correctamente en cookies.txt");
    } catch (error) {
        console.error("❌ Error al guardar cookies:", error);
    }
}

// Llamar a la función para guardar las cookies al iniciar el bot
saveCookiesToFile();

// Evento cuando el bot está listo
client.once('ready', () => {
    console.log(`Conectado como ${client.user.tag}`);
});

// Comando para reproducir audio
client.on('messageCreate', (message) => {
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
                cookies: "cookies.txt" // Referencia el archivo cookies.txt
            });

            const { createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');

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
});

// Iniciar el bot con tu token
client.login(process.env.DISCORD_TOKEN);

