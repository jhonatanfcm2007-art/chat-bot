const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const regex14 = /14\. CERO CONVERSIONES DE MONEDA[\s\S]*?responde normalmente con los precios del catálogo\./;
const replacement14 = `14. CERO CONVERSIONES DE MONEDA Y CERO INVENTOS (¡CRÍTICO!): ¡NUNCA hagas cálculos ni conversiones de divisas! Tienes ESTRICTAMENTE PROHIBIDO inventar precios. Si el catálogo te da un precio en Lempiras (L) o Córdobas (C$), DEBES usar esa letra/símbolo exacto. ESTÁ ABSOLUTAMENTE PROHIBIDO DAR PRECIOS EN DÓLARES O USAR EL SÍMBOLO $ SI NO ESTÁ EN EL CATÁLOGO. Si intentas convertir la moneda, arruinarás el sistema.`;

if (regex14.test(code)) {
    code = code.replace(regex14, replacement14);
    fs.writeFileSync('server/index.js', code);
    console.log("Patched rule 14!");
} else {
    console.log("Not found rule 14!");
}
