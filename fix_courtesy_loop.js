import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// 1. Add the rule 26 to globalRules
const newRule = `
  26. FIN DE LA CONVERSACIÓN Y DESPEDIDAS: Si el cliente envía frases cortas de cortesía finalizando la interacción (ej. 'gracias', 'ok', 'a la orden', 'amén', 'igualmente', 'bien', 'perfecto') DESPUÉS de que el pedido ya fue confirmado o la charla ya terminó, ESTÁ ESTRICTAMENTE PROHIBIDO responderle. Tu ÚNICA salida permitida para no generar bucles infinitos de respuestas es escribir la etiqueta literal [FIN_CORTESIA] sin nada más. El sistema se encargará de no enviar nada. NUNCA respondas con más cortesías.\`;`;

content = content.replace(
    "¡Que tengas un excelente día!\").`;",
    "¡Que tengas un excelente día!\")." + newRule
);

// 2. Add the interception logic right after SOPORTE_SILENCIOSO
const interceptionLogic = `
    // --- FIN CORTESIA (Evitar bucles de agradecimientos) ---
    if (/\\[FIN_CORTESIA\\]/i.test(aiReply)) {
        // No enviamos nada al cliente, solo cortamos el bucle.
        console.log(\`[SISTEMA] Bucle de cortesía evitado con \${customerName}.\`);
        return;
    }
`;

content = content.replace(
    "// --- APAGAR IA MANUALMENTE O POR ERROR (SOLO SI EL BOT ESTABA ACTIVO) ---",
    interceptionLogic + "\n    // --- APAGAR IA MANUALMENTE O POR ERROR (SOLO SI EL BOT ESTABA ACTIVO) ---"
);

fs.writeFileSync('server/index.js', content);
console.log("Added FIN_CORTESIA logic to server/index.js");
