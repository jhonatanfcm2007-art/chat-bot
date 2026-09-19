const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

// Match Rule 2 using a non-greedy regex
const oldRule2 = /2\. TIEMPOS DE ENTREGA Y SOPORTE:.*?para que un humano lo atienda\./s;
const newRule2 = `2. TIEMPOS DE ENTREGA Y SOPORTE: Los pedidos tardan de 1 a 3 días hábiles (1 día en ciudades principales y hasta 3 en zonas alejadas). Usando el "CONTEXTO DE TIEMPO" que se te proporciona al final, si el cliente pregunta "¿cuántos días tarda?" o "¿cuándo llega?", haz el cálculo rápidamente (saltando los domingos, ya que no hay envíos) y respóndele con naturalidad, por ejemplo: "Como hoy es [Día], te estaría llegando entre el [Día de llegada 1] y el [Día de llegada 3]". NUNCA te apagues por esto. SIN EMBARGO, si el cliente reporta un RETRASO (ej. "llevo 4 días esperando"), un problema, o reclama garantías, DEBES OBLIGATORIAMENTE responder ÚNICAMENTE con la etiqueta literal [APAGAR_BOT_SOPORTE] para que un humano lo atienda.`;

if (oldRule2.test(c)) {
    c = c.replace(oldRule2, newRule2);
} else {
    console.log("No encontré la regla 2.");
}

const openAiCall = /const comp = await activeOpenAI\.chat\.completions\.create\(\{/;
if (openAiCall.test(c)) {
    const dateLogic = `
        const nowGmt5 = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dayName = days[nowGmt5.getDay()];
        const todayDateStr = \`\${dayName}, \${nowGmt5.getDate()} de \${nowGmt5.toLocaleString('es', { month: 'long' })}\`;
        const timeStr = \`\${nowGmt5.getHours().toString().padStart(2, '0')}:\${nowGmt5.getMinutes().toString().padStart(2, '0')}\`;
        const dateContext = \`\\n\\n### CONTEXTO DE TIEMPO (GMT-5):\\n- Hoy es: \${todayDateStr}\\n- Hora actual: \${timeStr}\\n\`;

        const comp = await activeOpenAI.chat.completions.create({`;
        
    c = c.replace(openAiCall, dateLogic);
} else {
    console.log("No encontré el call de OpenAI.");
}

const promptInjection = /content: \`\$\{settings\[waLine\]\?\.systemPrompt \|\| settings\["1"\]\.systemPrompt\}\\n\\n\$\{knowledgeContext\}\$\{globalRules\}\` \}/;
if (promptInjection.test(c)) {
    c = c.replace(promptInjection, 'content: `${settings[waLine]?.systemPrompt || settings["1"].systemPrompt}\\n\\n${knowledgeContext}${globalRules}${dateContext}` }');
} else {
    console.log("No encontré la inyección del prompt.");
}

fs.writeFileSync('server/index.js', c);
console.log("Hecho.");
