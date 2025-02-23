# Discord Music Bot 🎵

Este es un bot de música para Discord desarrollado con **discord.js** y **@discordjs/voice**, que permite reproducir música desde YouTube.

## 🚀 Características
- 📢 Reproduce música en canales de voz.
- 🔎 Obtiene información de videos de YouTube.
- 🎶 Usa `play-dl` para el stream de audio.
- 🏓 Comando `!ping` para probar conexión.
- 💡 Se mantiene activo en Render enviando pings cada 5 minutos.

---
## 📌 Requisitos
Antes de ejecutar el bot, asegúrate de tener instalado:
- [Node.js](https://nodejs.org/) (versión 16 o superior)
- [Git](https://git-scm.com/)
- [NPM](https://www.npmjs.com/) o [Yarn](https://yarnpkg.com/)

También necesitas un **token de bot** de Discord:
1. Crea una aplicación en el [Discord Developer Portal](https://discord.com/developers/applications)
2. En la pestaña `Bot`, genera un **Token** y guárdalo en un archivo `.env`

---
## 🔧 Instalación y Configuración
1. Clona el repositorio:
   ```sh
   git clone https://github.com/tu-usuario/bot-discord.git
   cd bot-discord
   ```
2. Instala las dependencias:
   ```sh
   npm install
   ```
3. Crea un archivo `.env` y agrega tu **TOKEN**:
   ```env
   DISCORD_TOKEN=TU_TOKEN_AQUI
   ```
4. Ejecuta el bot:
   ```sh
   node index.js
   ```

---
## 📜 Comandos
- `!ping` → Responde "Pong!"
- `!play <URL>` → Reproduce música desde YouTube

---
## 📡 Despliegue en Render
1. Crea un nuevo servicio en [Render](https://render.com/)
2. Sube tu código o conecta tu repositorio de GitHub
3. Configura la variable de entorno `DISCORD_TOKEN`
4. Usa `keep-alive` para evitar que Render duerma tu bot:
   ```js
   import fetch from 'node-fetch';

   setInterval(async () => {
       try {
           await fetch('https://tu-bot-en-render.onrender.com');
           console.log('Manteniendo bot despierto...');
       } catch (error) {
           console.error('Error al hacer ping:', error);
       }
   }, 300000); // Cada 5 minutos
   ```

---
## 📄 Licencia
Este proyecto está bajo la **MIT License**.

**¡Disfruta tu bot de música! 🎧🔥**
