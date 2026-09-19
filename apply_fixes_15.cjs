const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

const regex = /3\. PRECIOS EXACTOS: NUNCA ofrezcas un precio que no est[^]*?pa.s actual del cliente\./s;

const replacement = `3. PRECIOS EXACTOS Y ADAPTACIÓN DE GUIONES: Tienes estrictamente prohibido ofrecer un precio distinto al que aparece en la sección 'Precios y Combos'. ATENCIÓN: Es muy probable que los textos del embudo en 'Detalles y Beneficios' traigan precios de otro país (ej. "por solo L999"). Si la sección 'Precios y Combos' indica una moneda o valor distinto (ej. "$40"), TIENES LA OBLIGACIÓN ABSOLUTA de recitar el mismo guion de ventas pero SUSTITUYENDO el precio viejo por el nuevo valor de 'Precios y Combos'. NUNCA menciones la moneda vieja.`;

if (regex.test(c)) {
    c = c.replace(regex, replacement);
    fs.writeFileSync('server/index.js', c);
    console.log("Inyección exitosa de la Regla 3.");
} else {
    console.log("No se encontró la regla 3.");
}
