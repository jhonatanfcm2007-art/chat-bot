const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const regex = /SI EL PRECIO DICE "L 900", DI "L 900"\. ¡ESTÁ ESTRICTAMENTE PROHIBIDO CONVERTIR A DÓLARES O A CUALQUIER OTRA MONEDA! NUNCA USES EL SÍMBOLO \$ A MENOS QUE ESTÉ ESCRITO AQUÍ/g;
const replacement = "RESPETA LA MONEDA EXACTA. NO CONVIERTAS A DÓLARES NI A MONEDA LOCAL SI NO ESTÁ ESCRITO ASÍ. REPRODUCE EL TEXTO DEL PRECIO TAL CUAL APARECE AQUÍ";

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('server/index.js', code);
    console.log("Patched prompt!");
} else {
    console.log("Regex not found!");
}
