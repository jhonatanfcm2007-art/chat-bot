import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const oldRegex = /\[ENTREGAR_AHORA\] \[PRODUCTOS: ID_DEL_PRODUCTO xCant\] \[NOMBRE: xxx\].*?\[DIRECCION: \.\.\.\]!/is;

// Since I might get the regex wrong, I'll use index-based replacement.
const startMarker = "[ENTREGAR_AHORA] [PRODUCTOS: ID_DEL_PRODUCTO xCant]";
const endMarker = "dentro de [DIRECCION: ...]!";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker) + endMarker.length;

if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
    const newText = `[ENTREGAR_AHORA] [PRODUCTOS: Nombre Corto xCant] [NOMBRE: xxx] [TELEFONO: número extraído o el prefijo] [DIRECCION: SOLO calle, número o barrio] [REFERENCIAS: referencias] [MUNICIPIO: \${termCity}] [DEPARTAMENTO: deduce el/la \${termProv}] [PAIS: ISO de 2 letras del destino, ej HN, CO, SV, CR, CL, GT] [NOTAS: fechas]
  IMPORTANTE: ¡Asegúrate de incluir SIEMPRE las etiquetas de [PAIS: ...] y [TELEFONO: ...]! En [PRODUCTOS] usa ESTRICTAMENTE EL NOMBRE CORTO del producto de la base de conocimiento y la cantidad (ej. Shilajit x2, Crema x1). JAMÁS uses el ID numérico aquí porque romperás el sistema. ¡JAMÁS incluyas el municipio o departamento dentro de [DIRECCION: ...]!`;
    
    content = content.substring(0, startIndex) + newText + content.substring(endIndex);
    fs.writeFileSync('server/index.js', content);
    console.log("Successfully reverted globalRules back to using names instead of IDs");
} else {
    console.log("Could not find markers to replace", {startIndex, endIndex});
}
