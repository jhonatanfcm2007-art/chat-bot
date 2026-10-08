const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const regex1 = /4\. \$\{termCity\} \(Obligatorio, PROHIBIDO DEDUCIR\)\./g;
const replace1 = "4. ${termCity} (Obligatorio. Si el cliente menciona el nombre de un municipio, ciudad o departamento como Matagalpa, Managua, Tegucigalpa, acéptalo de inmediato como su Municipio y NO vuelvas a preguntarlo).";

const regex2 = /¡NUNCA deduzcas el \$\{termCity\} a partir de un barrio o referencia! Si falta el municipio, pregúntalo\. PERO EXCEPCIÓN: Si el cliente ya dio un municipio o capital clara \(Ej: Tegucigalpa, San Pedro Sula, San Salvador\), ESTÁ PROHIBIDO pedirle el \$\{termProv\}, el sistema lo autocompletará por ti\./g;
const replace2 = "¡NUNCA deduzcas el ${termCity} a partir de un simple barrio! PERO si el cliente menciona un lugar importante (Ej: Matagalpa, Managua, San Pedro Sula, Tegucigalpa), ASUME inmediatamente que ese es el ${termCity} y NO vuelvas a preguntarlo. Además, NO le pidas el ${termProv}, el sistema lo deducirá.";

const regex3 = /- Si el cliente te da una dirección pero NO ha mencionado explícitamente el \$\{termCity\}, NO confirmes el pedido\./g;
const replace3 = "- Si el cliente te da una dirección pero NO ha mencionado explícitamente el ${termCity} o departamento, NO confirmes el pedido. PERO si ya dijo el nombre de un pueblo, ciudad, municipio o departamento, Dalo por válido de inmediato.";

code = code.replace(regex1, replace1);
code = code.replace(regex2, replace2);
code = code.replace(regex3, replace3);

fs.writeFileSync('server/index.js', code);
console.log('Fixed Matagalpa geo issues');
