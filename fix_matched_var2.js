import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

content = content.replace(
    /const matchedVar = prod\.priceVariations\.find\([\s\S]*?\}\);/,
    `const matchedVar = prod.priceVariations.find(v => {
        const rawPrefix = String(v.prefix || '').trim().toUpperCase();
        const cleanPrefix = rawPrefix.replace(/\\D/g, '');
        if (cleanPrefix && cleanPhone.startsWith(cleanPrefix)) return true;
        if (rawPrefix === detectedCountry.toUpperCase()) return true;
        return false;
    });`
);

fs.writeFileSync('server/index.js', content);
