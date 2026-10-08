const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

// 1. Fix country inference for line 4
const regexWa = /\/\/ Si es Honduras \(Línea 3\)\s*if \(waLine === '3'\) \{\s*countryISO = 'HN';\s*\}/g;
const replacementWa = `// Si es Honduras (Línea 3 o Línea 4)
    if (waLine === '3' || waLine === '4') {
        countryISO = 'HN';
    }`;

// 2. Fix the prefix appending logic
// Find the exact block in createShopifyOrder
const regexPhone = /\/\/ Estandarizar prefijo de país\s*if \(countryISO === 'GT' && !finalPhone\.startsWith\('502'\)\) \{\s*finalPhone = '502' \+ finalPhone;\s*\} else if \(countryISO === 'HN' && !finalPhone\.startsWith\('504'\)\) \{\s*finalPhone = '504' \+ finalPhone;\s*\} else if \(countryISO === 'CL' && !finalPhone\.startsWith\('56'\)\) \{\s*finalPhone = '56' \+ finalPhone;\s*\}/g;

const replacementPhone = `// Estandarizar prefijo de país SOLO si la longitud coincide con números locales
        // (Ej. en CA los números locales tienen 8 dígitos. Si tiene más, suele ser internacional como el +1 de USA).
        if (countryISO === 'GT' && !finalPhone.startsWith('502') && finalPhone.length === 8) {
            finalPhone = '502' + finalPhone;
        } else if (countryISO === 'HN' && !finalPhone.startsWith('504') && finalPhone.length === 8) {
            finalPhone = '504' + finalPhone;
        } else if (countryISO === 'SV' && !finalPhone.startsWith('503') && finalPhone.length === 8) {
            finalPhone = '503' + finalPhone;
        } else if (countryISO === 'CL' && !finalPhone.startsWith('56') && finalPhone.length === 9) {
            finalPhone = '56' + finalPhone;
        }`;

let modified = false;

if (code.match(regexWa)) {
    code = code.replace(regexWa, replacementWa);
    modified = true;
    console.log("Patched waLine 4!");
} else {
    console.log("Could not find regexWa");
}

if (code.match(regexPhone)) {
    code = code.replace(regexPhone, replacementPhone);
    modified = true;
    console.log("Patched Phone Prefix logic!");
} else {
    console.log("Could not find regexPhone");
}

if (modified) {
    fs.writeFileSync('server/index.js', code);
    console.log("Changes written to server/index.js");
}
