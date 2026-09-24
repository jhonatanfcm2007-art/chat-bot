import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// 1. Move detectedCountry up
content = content.replace(
    /          \/\/ Regla inquebrantable de seguridad para evitar alucinaciones y polticas generales\r?\n          let detectedCountry = getCountryFromPhone\(fromPhone\);\r?\n          let countryContext = detectedCountry !== 'Desconocido' \? detectedCountry : "Guatemala"; \/\/ Default/g,
    ""
);

content = content.replace(
    "          let hasProductImage = false;",
    `          let hasProductImage = false;
          let detectedCountry = getCountryFromPhone(fromPhone);
          let countryContext = detectedCountry !== 'Desconocido' ? detectedCountry : "Guatemala";`
);

// 2. Update matchedVar logic
const oldMatch = `const matchedVar = prod.priceVariations.find(v => {
                          const cleanPrefix = (v.prefix || '').replace(/\\D/g, '');
                          return cleanPrefix && cleanPhone.startsWith(cleanPrefix);
                      });`;
const newMatch = `const matchedVar = prod.priceVariations.find(v => {
                          const rawPrefix = String(v.prefix || '').trim().toUpperCase();
                          const cleanPrefix = rawPrefix.replace(/\\D/g, '');
                          if (cleanPrefix && cleanPhone.startsWith(cleanPrefix)) return true;
                          if (rawPrefix === detectedCountry.toUpperCase()) return true;
                          return false;
                      });`;
content = content.replace(oldMatch, newMatch);

// 3. Add Rule 27
const rule27 = `
  27. INSISTENCIA EN EL PRECIO (¡SENTIDO COMÚN!): Si el cliente te pregunta directamente "cuál es el precio", "cuánto vale", "precio", etc., ¡DALE LOS PRECIOS INMEDIATAMENTE! Ignora cualquier regla de tu embudo que te prohíba dar precios sin que respondan otra cosa. ¡El objetivo es vender! NUNCA uses [APAGAR_BOT_SOPORTE] por esto.\`;`;

content = content.replace(
    "NUNCA respondas con ms cortesas.`;",
    "NUNCA respondas con ms cortesas." + rule27
);

fs.writeFileSync('server/index.js', content);
console.log("Fixes applied successfully.");
