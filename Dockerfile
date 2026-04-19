# Imagen base ligera de Node.js
FROM node:22-slim

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias de la raíz
COPY package*.json ./
RUN npm install

# Copiar archivos de dependencias del servidor
COPY server/package*.json ./server/
RUN cd server && npm install

# Copiar todo el código del proyecto
COPY . .

# Construir el frontend de Vite
RUN npm run build

# Informar a Railway sobre el puerto
ENV PORT=3001
EXPOSE 3001

# Comando de inicio
CMD ["node", "server/index.js"]
