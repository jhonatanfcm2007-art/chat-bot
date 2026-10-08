const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const regex = /knowledgeContext \+\= \`Precios y Combos:\\n\$\{finalPrices\}\\n\`;/;
const replacement = `knowledgeContext += \`Precios y Combos (¡OBLIGATORIO: LEE LOS PRECIOS EXACTAMENTE COMO ESTÁN AQUÍ! SI EL PRECIO DICE "L 900", DI "L 900". ¡ESTÁ ESTRICTAMENTE PROHIBIDO CONVERTIR A DÓLARES O A CUALQUIER OTRA MONEDA! NUNCA USES EL SÍMBOLO $ A MENOS QUE ESTÉ ESCRITO AQUÍ):\\n\${finalPrices}\\n\`;`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('server/index.js', code);
    console.log("Patched price context!");
} else {
    console.log("Not found!");
}
