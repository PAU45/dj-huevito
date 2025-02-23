require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus
} = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const { pipeline, PassThrough } = require('stream');
const { CookieJar } = require('tough-cookie');

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

// Función para obtener las cookies desde la variable de entorno en formato JSON
function getCookies() {
    try {
        const cookieData = JSON.parse(process.env.YTDL_COOKIES || "{}");
        if (!cookieData.cookies) return null;

        const cookieJar = new CookieJar();
        cookieData.cookies.forEach(cookie => {
            cookieJar.setCookieSync(`${cookie.name}=${cookie.value}`, `https://${cookie.domain}`);
        });

        return { cookieJar };
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

        if (!songUrl || !ytdl.validateURL(songUrl)) {
            console.log('URL no válida');
            return message.channel.send('❌ Por favor, proporciona una URL válida de YouTube.');
        }

        const channel = message.member.voice.channel;
        if (!channel) {
            console.log('El usuario no está en un canal de voz');
            return message.channel.send('⚠️ ¡Debes estar en un canal de voz para usar este comando!');
        }

        try {
            // Obtener información del video usando cookies
            const info = await ytdl.getInfo(songUrl, getCookies());

            if (!info) {
                return message.channel.send('❌ No se pudo obtener información del video.');
            }

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

            // Crear el stream de audio con cookies
            const stream = ytdl(songUrl, {
                filter: 'audioonly',
                quality: 'highestaudio',
                highWaterMark: 1 << 25, // Mejora el buffer
                ...getCookies() // Agregar cookies correctamente
            });

            const passthrough = new PassThrough();
            pipeline(stream, passthrough, (err) => {
                if (err) console.error('❌ Error en el stream:', err);
            });

            const resource = createAudioResource(passthrough);
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

            message.channel.send(`🎶 Reproduciendo: **${info.videoDetails.title}**`);
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
