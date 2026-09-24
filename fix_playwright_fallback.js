import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const regex = /let serviceUrl = process\.env\.PLAYWRIGHT_SERVICE_URL \|\| 'http:\/\/localhost:3001';/g;

const replacement = `let serviceUrl = process.env.PLAYWRIGHT_SERVICE_URL;
        if (!serviceUrl) {
            // Si estamos en entorno de producción, fallar si no hay URL configurada
            if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
                return res.status(500).json({ 
                    success: false, 
                    error: "Falta configurar la variable PLAYWRIGHT_SERVICE_URL en producción. Asegúrate de vincular el dominio privado del microservicio." 
                });
            } else {
                serviceUrl = 'http://localhost:3001'; // Fallback para pruebas locales
            }
        }`;

content = content.replace(regex, replacement);
fs.writeFileSync('server/index.js', content);
console.log("Updated fallback logic in server/index.js");
