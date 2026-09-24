# Utilizamos la imagen oficial de Playwright que ya contiene Chromium y todas sus dependencias de SO
FROM mcr.microsoft.com/playwright:v1.47.0-jammy

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de Node.js
RUN npm install --production

# Copiar el código fuente
COPY . .

# Exponer el puerto
EXPOSE 3001

# Comando de inicio
CMD ["npm", "start"]
