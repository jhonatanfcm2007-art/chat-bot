const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const regex = /\/\/ BORRAMOS físicamente cualquier precio hardcodeado solo si la variación de país tiene precios reales numéricos\s*detailsText = detailsText\.replace\(\/\[LQC\\\$\]\\s\*\\\\\.?\\s\*\\\\d\+\(\[\.,\]\\\\d\+\)\?\/gi, "\[MENCIONA AQUÍ EL PRECIO DE LA TABLA PRECIOS Y COMBOS\]"\);/g;

if (code.includes('detailsText.replace(/[LQC\\$]')) {
    code = code.replace(/detailsText = detailsText\.replace\(\/\[LQC\\\$\]\\s\*\\\\\.?\\s\*\\\\d\+\(\[\.,\]\\\\d\+\)\?\/gi, "\[MENCIONA AQUÍ EL PRECIO DE LA TABLA PRECIOS Y COMBOS\]"\);/g, '');
    fs.writeFileSync('server/index.js', code);
    console.log("Patched!");
} else {
    console.log("Not found using simple include!");
}
