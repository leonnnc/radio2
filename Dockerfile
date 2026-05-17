FROM node:18-alpine

# Instalar ffmpeg y python/pip (requerido para yt-dlp)
RUN apk update && apk add --no-cache ffmpeg python3 py3-pip

# Instalar yt-dlp (Alpine moderno requiere break-system-packages para pip global)
RUN pip3 install yt-dlp --break-system-packages

# Configurar directorio de la app
WORKDIR /usr/src/app

# Copiar configuración de dependencias
COPY package.json ./

# Instalar dependencias de Node.js (si hubiera alguna futura)
RUN npm install --only=production

# Copiar el servidor y las cookies
COPY server.js cookies.txt ./

# Exponer el puerto
EXPOSE 7979

# Comando para iniciar el servidor
CMD ["npm", "start"]
