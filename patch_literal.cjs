const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const regex = /5\. Dirección exacta, barrio o punto de referencia\./;
const replacement = `5. Dirección de entrega (CUALQUIERA de las siguientes opciones es válida: dirección exacta, O nombre del barrio, O punto de referencia).`;

code = code.replace(regex, replacement);

const regex2 = /- En los campos ocultos, NUNCA coloques textos como "\([^)]*\)" ni los dejes en blanco\./;
const replacement2 = `- En los campos ocultos, NUNCA coloques textos como "(Deduce el municipio...)" ni los dejes en blanco.
- ¡PROHIBIDO SER REDUNDANTE CON LA DIRECCIÓN! Si el cliente ya te dio un barrio (ej. "Colonia 3 de Mayo", "Nueva vida segunda etapa") o una dirección básica, ACÉPTALA DE INMEDIATO como válida para el campo 5. ESTÁ TOTALMENTE PROHIBIDO pedirle "puntos de referencia", "dirección más exacta" o "detalles adicionales". ¡Cierra la venta con lo que te dio!`;

code = code.replace(regex2, replacement2);

fs.writeFileSync('server/index.js', code);
console.log("Patched rule 10!");
