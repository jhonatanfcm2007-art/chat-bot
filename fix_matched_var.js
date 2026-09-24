import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

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

if (content.includes(oldMatch)) {
    content = content.replace(oldMatch, newMatch);
    fs.writeFileSync('server/index.js', content);
    console.log("matchedVar replaced successfully");
} else {
    console.log("oldMatch not found");
}
