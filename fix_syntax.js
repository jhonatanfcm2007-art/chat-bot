import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// 1. Fix the \n literal
content = content.replace(
    /let hasProductImage = false;\\nlet detectedCountry/g,
    "let hasProductImage = false;\nlet detectedCountry"
);
content = content.replace(
    /FromPhone\(fromPhone\);\\nlet countryContext/g,
    "FromPhone(fromPhone);\nlet countryContext"
);

// 2. Fix the template string ending
content = content.replace(
    /NUNCA respondas con mǭs cortesas\.\`;\r?\n\s*27\. INSISTENCIA EN EL PRECIO[\s\S]*?explicaciones\.\`;/g,
    "NUNCA respondas con mǭs cortesas.\n  27. INSISTENCIA EN EL PRECIO (¡SENTIDO COMÚN!): Si el cliente te pregunta directamente \"cuál es el precio\", \"cuánto vale\", \"precio\", etc., ¡DALE LOS PRECIOS INMEDIATAMENTE! Ignora cualquier regla de tu embudo que te prohíba dar precios sin que respondan otra cosa. ¡El objetivo es vender! NUNCA uses [APAGAR_BOT_SOPORTE] por esto. NUNCA respondas con excusas ni explicaciones.`"
);

// Fallback if the encoding of 'cortesías' didn't match
content = content.replace(
    /NUNCA respondas con m.*? cortes.*?\.\`;\r?\n\s*27\. INSISTENCIA EN EL PRECIO[\s\S]*?explicaciones\.\`;/g,
    "NUNCA respondas con más cortesías.\n  27. INSISTENCIA EN EL PRECIO (¡SENTIDO COMÚN!): Si el cliente te pregunta directamente \"cuál es el precio\", \"cuánto vale\", \"precio\", etc., ¡DALE LOS PRECIOS INMEDIATAMENTE! Ignora cualquier regla de tu embudo que te prohíba dar precios sin que respondan otra cosa. ¡El objetivo es vender! NUNCA uses [APAGAR_BOT_SOPORTE] por esto. NUNCA respondas con excusas ni explicaciones.`;"
);

fs.writeFileSync('server/index.js', content);
