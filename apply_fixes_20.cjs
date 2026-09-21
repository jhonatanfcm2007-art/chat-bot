const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

const regex = /\{ role: "system", content: "RECORDATORIO DE EMERGENCIA Y REGLA ABSOLUTA:.*?\[APAGAR_BOT_SOPORTE\] y nada mas\." \}/;

const replacement = `{ role: "system", content: "RECORDATORIO DE EMERGENCIA Y REGLA ABSOLUTA: 1) Si el cliente menciona dolares, centavos u otra moneda distinta al catalogo. 2) Si el cliente pide ver fotos, imagenes, como es el producto, o dice que quiere verla. EN CUALQUIERA DE ESTOS DOS CASOS, ESTA ESTRICTAMENTE PROHIBIDO DAR EXPLICACIONES O DISCULPARTE. TU UNICA SALIDA PERMITIDA es escribir exactamente la etiqueta [APAGAR_BOT_SOPORTE] y nada mas, para que un humano asuma el control." }`;

if (regex.test(c)) {
    c = c.replace(regex, replacement);
    fs.writeFileSync('server/index.js', c);
    console.log("Inyección de emergencia actualizada con fotos.");
} else {
    console.log("No se encontró el recordatorio de emergencia.");
}
