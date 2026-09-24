import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const rule27 = `
  27. INSISTENCIA EN EL PRECIO (¡SENTIDO COMÚN!): Si el cliente te pregunta directamente "cuál es el precio", "cuánto vale", "precio", etc., ¡DALE LOS PRECIOS INMEDIATAMENTE! Ignora cualquier regla de tu embudo que te prohíba dar precios sin que respondan otra cosa. ¡El objetivo es vender! NUNCA uses [APAGAR_BOT_SOPORTE] por esto. NUNCA respondas con excusas ni explicaciones.\`;`;

content = content.replace(
    /NUNCA respondas con m.s cortes.*?\`;/,
    "$&" + rule27
);

fs.writeFileSync('server/index.js', content);
