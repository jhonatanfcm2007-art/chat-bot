import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// Replace the original let detectedCountry
content = content.replace(
    /          \/\/ Regla inquebrantable de seguridad para evitar alucinaciones y pol.*ticas generales\r?\n          let detectedCountry = getCountryFromPhone\(fromPhone\);\r?\n          let countryContext = detectedCountry !== 'Desconocido' \? detectedCountry : "Guatemala"; \/\/ Default\r?\n/g,
    ""
);

// Verify if the second one is there
if (!content.includes('let hasProductImage = false;\n          let detectedCountry = getCountryFromPhone(fromPhone);')) {
    content = content.replace(
        "          let hasProductImage = false;",
        `          let hasProductImage = false;\n          let detectedCountry = getCountryFromPhone(fromPhone);\n          let countryContext = detectedCountry !== 'Desconocido' ? detectedCountry : "Guatemala";`
    );
}

fs.writeFileSync('server/index.js', content);
