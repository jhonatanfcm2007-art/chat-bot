const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

const regex = /\.\.\.history\.map\(m => \(\{[\s\S]*?content: m\.content \|\| m\.body[\s\S]*?\}\)\),[\s\S]*?\{ role: "user", content: message \}/;

const replacement = `                ...history.map(m => ({ 
                    role: m.role === 'user' ? 'user' : (m.role === 'system' ? 'system' : 'assistant'), 
                    content: m.content || m.body 
                })),
                { role: "system", content: "RECORDATORIO DE EMERGENCIA Y REGLA ABSOLUTA: Si el cliente acaba de mencionar 'dólar', 'dólares', '$', 'centavos', o cualquier moneda distinta a la de tu catálogo, o te pide el precio en otra moneda, ESTÁ ESTRICTAMENTE PROHIBIDO que respondas o hagas una conversión. TU ÚNICA SALIDA PERMITIDA es escribir exactamente la etiqueta [APAGAR_BOT_SOPORTE] y nada más." },
                { role: "user", content: message }`;

if (regex.test(c)) {
    c = c.replace(regex, replacement);
    fs.writeFileSync('server/index.js', c);
    console.log("Inyección exitosa con Regex.");
} else {
    console.log("Aún no encuentra el target.");
}
