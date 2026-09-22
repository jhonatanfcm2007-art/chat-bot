import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// Replace Rule 14
const rule14Regex = /14\. CERO CONVERSIONES DE MONEDA.*?Cero excepciones!/s;
const newRule14 = `14. CERO CONVERSIONES DE MONEDA (¡CRÍTICO!): ¡NUNCA hagas cálculos ni conversiones de divisas! Si un cliente pide precios en una moneda que NO ESTÁ en el catálogo (ej. si el catálogo tiene Lempiras y el cliente pide en Dólares, o viceversa), ESTÁ ESTRICTAMENTE PROHIBIDO inventar un precio equivalente o hacer conversiones matemáticas. En estos casos, tu ÚNICA RESPUESTA debe ser la etiqueta [APAGAR_BOT_SOPORTE]. PERO si el catálogo YA TIENE los precios en la moneda de su país (ej. dólares para El Salvador, o lempiras para Honduras), responde normalmente con los precios del catálogo.`;
if (content.match(rule14Regex)) {
    content = content.replace(rule14Regex, newRule14);
}

// Replace Emergency Rule 1
const emergencyRegex = /1\) Si el cliente menciona dolares, centavos u otra moneda distinta al catalogo\./g;
const newEmergency = `1) Si el cliente pide precios en una moneda que NO EXISTE en tu catálogo.`;
if (content.match(emergencyRegex)) {
    content = content.replace(emergencyRegex, newEmergency);
}

fs.writeFileSync('server/index.js', content);
console.log("Patched currency rules to avoid false positives for El Salvador");
