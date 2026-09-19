const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

const regex = /\{ role: "system", content: "RECORDATORIO DE EMERGENCIA[\s\S]*?\{ role: "user", content: message \}/;

const replacement = `{ role: "system", content: "RECORDATORIO DE EMERGENCIA Y REGLA ABSOLUTA: Si el cliente acaba de mencionar dolares, la palabra dolar, centavos, u otra moneda distinta al catalogo, ESTA ESTRICTAMENTE PROHIBIDO que respondas o hagas una conversion. TU UNICA SALIDA PERMITIDA es escribir exactamente la etiqueta [APAGAR_BOT_SOPORTE] y nada mas." },\n                { role: "user", content: message }`;

if (regex.test(c)) {
    c = c.replace(regex, replacement);
    fs.writeFileSync('server/index.js', c);
    console.log("Inyección exitosa con Regex (Sin tildes ni $).");
} else {
    console.log("Aún no encuentra el target.");
}
