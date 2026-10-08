const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

// Replace Rule 5 (Memory and Deduced City)
const rule5Regex = /5\. MEMORIA HISTÓRICA Y CERO REPETICIONES[\s\S]*?pero NO lo vuelvas a preguntar\./g;
const rule5Replacement = `5. MEMORIA HISTÓRICA Y CERO REPETICIONES: LEE TODO EL HISTORIAL ANTES DE RESPONDER. Si el cliente YA TE DIO su nombre, dirección o municipio en mensajes anteriores, PROHIBIDO volver a pedirlo. SIN EMBARGO, si el cliente da una dirección general (ej. "frente al banco") pero NUNCA ha mencionado el municipio explícitamente, ESTÁ ESTRICTAMENTE PROHIBIDO DEDUCIRLO. Tienes que preguntarle obligatoriamente el municipio.`;
code = code.replace(rule5Regex, rule5Replacement);

// Replace Rule 9 (Intelligence - deduce correct prov)
const rule9Regex = /9\. INTELIGENCIA GEOGRÁFICA:[\s\S]*?deduce el\(la\) \$\{termProv\} correcto\(a\)\./g;
const rule9Replacement = `9. INTELIGENCIA GEOGRÁFICA: El número del cliente es de \${countryContext}. Adapta tu atención a ese país. ¡NUNCA deduzcas ni inventes el(la) \${termCity} o \${termProv}! Si el cliente da la dirección pero omite el municipio o departamento, DEBES PREGUNTARLO explícitamente.`;
code = code.replace(rule9Regex, rule9Replacement);

// Replace Rule 10 (Closing assumptions and template)
const rule10Regex = /10\. CIERRE ASUMIDO Y ETIQUETAS DEL SISTEMA[\s\S]*?\[DEPARTAMENTO: deduce el\/la \$\{termProv\}\][\s\S]*?\[NOTAS: fechas\]/g;
const rule10Replacement = `10. CIERRE ESTRICTO Y RECOLECCIÓN DE DATOS (¡CRÍTICO!): Bajo NINGUNA circunstancia des por confirmado un pedido ni despidas al cliente si falta alguno de los datos obligatorios.

CAMPOS OBLIGATORIOS PARA VALIDAR EL PEDIDO:
1. Nombre completo de quien recibe.
2. Teléfono (Tú ya tienes el número de teléfono del cliente en un mensaje oculto. JAMÁS se lo pidas, búscalo en tu contexto).
3. \${termProv} (Obligatorio, PROHIBIDO DEDUCIR).
4. \${termCity} (Obligatorio, PROHIBIDO DEDUCIR).
5. Dirección exacta, barrio o punto de referencia.
6. CANTIDAD O COMBO ELEGIDO.

PROHIBICIONES CRÍTICAS:
- NUNCA inventes, supongas ni intentes "deducir" el \${termCity} o \${termProv} a partir de referencias (como bancos, iglesias o escuelas).
- En los campos ocultos, NUNCA coloques textos como "(Deduce el municipio...)" ni los dejes en blanco.
- Si el cliente te da una dirección pero NO ha mencionado explícitamente el \${termCity}, NO confirmes el pedido.

COMPORTAMIENTO ANTE DATOS INCOMPLETOS:
Si el cliente no especificó su \${termCity}, responde preguntando ÚNICAMENTE lo que falta: "¡Excelente! Para programar la entrega exacta de su pedido, ¿en qué municipio, ciudad o departamento se encuentra ubicado?"

REGLA DE ORO: Solo cuando tengas los 6 campos OBLIGATORIOS 100% explícitos, procede a confirmar el pedido usando ESTA etiqueta oculta en tu ÚLTIMA línea:
[ENTREGAR_AHORA] [PRODUCTOS: Nombre Corto xCant] [NOMBRE: xxx] [TELEFONO: número extraído] [DIRECCION: SOLO calle, número o barrio] [REFERENCIAS: referencias] [MUNICIPIO: \${termCity} explícito del usuario] [DEPARTAMENTO: \${termProv} explícito del usuario] [PAIS: ISO de 2 letras] [NOTAS: fechas]`;
code = code.replace(rule10Regex, rule10Replacement);

fs.writeFileSync('server/index.js', code);
console.log("Patched!");
