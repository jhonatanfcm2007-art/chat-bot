import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// Modificar regla de oro de cierre para prohibir confirmaciones
const targetOro = `  REGLA DE ORO DE CIERRE: ¡ESTÁ ESTRICTAMENTE PROHIBIDO EMITIR LA ETIQUETA \\[ENTREGAR_AHORA\\] SI EL CLIENTE AÚN NO HA ELEGIDO QUÉ COMBO O CANTIDAD DESEA LLEVAR! Si el cliente te da sus datos pero no ha elegido la cantidad, AGRADÉCELE Y PRESÉNTALE LOS COMBOS Y PRECIOS ANTES DE CONFIRMAR.
    Cuando tengas TODO \\(nombre real, lugar de entrega, municipio, Y cantidad elegida\\), DEBES usar la etiqueta oculta \\[ENTREGAR_AHORA\\] para cerrar la venta. ¡ATENCIÓN, ESTO ES VITAL! NUNCA exijas una "dirección completa". Si el cliente te da el nombre de una oficina, un local, una escuela, o un punto de referencia corto \\(ej. "en oficina Agrolibano", "por el parque", "casa verde"\\), ASUME QUE ESA ES SU DIRECCIÓN Y CIERRA LA VENTA INMEDIATAMENTE emitiendo la etiqueta \\[ENTREGAR_AHORA\\]. ¡NO LE VUELVAS A PEDIR LA DIRECCIÓN SI YA TE DIO UN LUGAR O REFERENCIA! Es OBLIGATORIO emitir la etiqueta en la ÚLTIMA LÍNEA de tu mensaje.`;

const fixOro = `  REGLA DE ORO DE CIERRE: ¡ESTÁ ESTRICTAMENTE PROHIBIDO EMITIR LA ETIQUETA [ENTREGAR_AHORA] SI EL CLIENTE AÚN NO HA ELEGIDO QUÉ COMBO O CANTIDAD DESEA LLEVAR! Si el cliente te da sus datos pero no ha elegido la cantidad, AGRADÉCELE Y PRESÉNTALE LOS COMBOS Y PRECIOS ANTES DE CONFIRMAR.
    Cuando tengas TODO (nombre real, lugar de entrega, municipio, Y cantidad elegida), DEBES usar la etiqueta oculta [ENTREGAR_AHORA] para cerrar la venta. ¡ATENCIÓN, ESTO ES VITAL! NUNCA exijas una "dirección completa". Si el cliente te da un punto de referencia, ASUME QUE ESA ES SU DIRECCIÓN Y CIERRA LA VENTA INMEDIATAMENTE.
    ¡PROHIBIDO PEDIR CONFIRMACIÓN! JAMÁS le digas al cliente "si todo está correcto procederé a enviarlo" ni "confirmando tu dirección...". En el preciso instante en que tengas los datos, EMITE LA ETIQUETA [ENTREGAR_AHORA] EN ESE MISMO MENSAJE para cerrar la venta. Es OBLIGATORIO emitir la etiqueta en la ÚLTIMA LÍNEA.`;

// Due to encodings, I'll use regex for the REGLA DE ORO
const regexOro = /REGLA DE ORO DE CIERRE:.*?ÚLTIMA LÍNEA de tu mensaje\./s;
content = content.replace(regexOro, fixOro);

// Añadir Regla 24
const targetRegla = "NUNCA inventes direcciones de locales.`;";
const fixRegla = `NUNCA inventes direcciones de locales.
  24. PREGUNTAS DE CONFIANZA EN EL CIERRE (¡CRÍTICO!): Si el cliente ya dio sus datos y hace una pregunta de confianza como "¿es seguro?", "¿sí funciona?", "¿me aseguras que es excelente?", "¿me garantiza que es original?", NUNCA uses [APAGAR_BOT_SOPORTE]. Simplemente respóndele con muchísima seguridad que SÍ, que el producto es 100% original, garantizado y excelente, y CIERRA LA VENTA INMEDIATAMENTE emitiendo la etiqueta [ENTREGAR_AHORA] en ese mismo mensaje para no dejar enfriar al cliente.\`;`;

content = content.replace(targetRegla, fixRegla);

fs.writeFileSync('server/index.js', content);
console.log("Patched confirmation and confidence rules");
