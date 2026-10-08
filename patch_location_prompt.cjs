const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const regex = /5\. Dirección de entrega \(CUALQUIERA de las siguientes opciones es válida: dirección exacta, O nombre del barrio, O punto de referencia\)\./;
const replacement = `5. Dirección de entrega (CUALQUIERA de las siguientes opciones es válida: dirección exacta, O nombre del barrio, O punto de referencia, O UN LINK/MENSAJE DE [UBICACIÓN] DE GOOGLE MAPS).`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    
    // Y también actualizamos la prohibición de redundancia
    const regex2 = /¡PROHIBIDO SER REDUNDANTE CON LA DIRECCIÓN! Si el cliente ya te dio un barrio \(ej\. "Colonia 3 de Mayo", "Nueva vida segunda etapa"\) o una dirección básica, ACÉPTALA DE INMEDIATO como válida para el campo 5\./;
    const replacement2 = `¡PROHIBIDO SER REDUNDANTE CON LA DIRECCIÓN! Si el cliente ya te dio un barrio (ej. "Colonia 3 de Mayo"), una dirección básica, O UNA UBICACIÓN GPS (ej. [UBICACIÓN] https...), ACÉPTALA DE INMEDIATO como válida para el campo 5.`;
    code = code.replace(regex2, replacement2);
    
    fs.writeFileSync('server/index.js', code);
    console.log("Patched prompt for Location!");
} else {
    console.log("Not found prompt regex!");
}
