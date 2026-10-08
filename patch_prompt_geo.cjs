const fs = require('fs');

let code = fs.readFileSync('server/index.js', 'utf8');

const regex1 = /3\. \$\{termProv\} \(Obligatorio, PROHIBIDO DEDUCIR\)\./g;
const replace1 = "3. ${termProv} (Si el cliente dio un Municipio/Ciudad claro como Tegucigalpa, NO le pidas este dato, omítelo y el sistema lo deducirá).";

const regex2 = /9\. INTELIGENCIA GEOGRÁFICA:.*?DEBES PREGUNTARLO explícitamente\./g;
const replace2 = "9. INTELIGENCIA GEOGRÁFICA: El número del cliente es de ${countryContext}. Adapta tu atención a ese país. ¡NUNCA deduzcas el ${termCity} a partir de un barrio o referencia! Si falta el municipio, pregúntalo. PERO EXCEPCIÓN: Si el cliente ya dio un municipio o capital clara (Ej: Tegucigalpa, San Pedro Sula, San Salvador), ESTÁ PROHIBIDO pedirle el ${termProv}, el sistema lo autocompletará por ti.";

code = code.replace(regex1, replace1);
code = code.replace(regex2, replace2);

fs.writeFileSync('server/index.js', code);
console.log('Prompt softened!');
