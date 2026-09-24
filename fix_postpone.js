import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const newRule = `
  25. COMPRAS POSPUESTAS: Si el cliente indica que comprará después, que le escribamos luego, o que hará el pedido en unos días, quincena, o fin de mes, ESTÁ ESTRICTAMENTE PROHIBIDO apagarte. Simplemente respóndele de forma amable y servicial, diciéndole que con gusto estarás a su disposición para cuando desee realizar el pedido (ej: "¡Perfecto! Quedo a tu entera disposición para cuando desees realizar tu pedido. ¡Que tengas un excelente día!").\`;`;

content = content.replace(
    "mismo mensaje para no dejar enfriar al cliente.`;",
    "mismo mensaje para no dejar enfriar al cliente." + newRule
);

fs.writeFileSync('server/index.js', content);
console.log("Added rule for posponed purchases.");
