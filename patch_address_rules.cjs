const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const targetStr = 'Si el cliente ya te dio un barrio (ej. "Colonia 3 de Mayo"), una dirección básica, O UNA UBICACIÓN GPS';
const replaceStr = 'Si el cliente ya te dio un lugar conocido (ej. un Mall, Centro Comercial, plaza), un barrio (ej. "Colonia 3 de Mayo"), una dirección básica, O UNA UBICACIÓN GPS';

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replaceStr);
    fs.writeFileSync('server/index.js', code);
    console.log('Address rules expanded successfully!');
} else {
    console.log('Target string not found for address rules.');
}
