const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

// 1. History -12 to -8
code = code.replace(/const allMessages = refreshedChat\.messages\.slice\(-12\);/, 'const allMessages = refreshedChat.messages.slice(-8);');

// 2. Rule 22 interpolation
const rule22Old = "22. NÚMERO DE TELÉFONO (¡ESTRICTO!): ¡TÚ YA TIENES el número de teléfono del cliente! Su número real es ${fromPhone.split('@')[0].split('_')[0]}. Está ESTRICTAMENTE PROHIBIDO usar el número de ejemplo 3001234567. Si lo usas, arruinarás el pedido. Al generar la etiqueta final, usa SIEMPRE [TELEFONO: ${fromPhone.split('@')[0].split('_')[0]}] a menos que el cliente te dé otro distinto.";
const rule22New = "22. NÚMERO DE TELÉFONO (¡ESTRICTO!): ¡TÚ YA TIENES el número de teléfono del cliente! Está ESTRICTAMENTE PROHIBIDO usar el número de ejemplo 3001234567. Si lo usas, arruinarás el pedido. Al generar la etiqueta final, usa SIEMPRE el número proporcionado en el [CONTEXTO DEL CLIENTE] al final de las instrucciones, a menos que el cliente te dé otro distinto.";
code = code.replace(rule22Old, rule22New);

// 3. Messages array caching optimization
const replaceStr = `            messages: [
                { role: "system", content: \`\${settings[waLine]?.systemPrompt || settings["1"].systemPrompt}\\n\\n\${knowledgeContext}\${globalRules}\` },
                                ...history.map(m => ({ 
                    role: m.role === 'user' ? 'user' : (m.role === 'system' ? 'system' : 'assistant'), 
                    content: m.content || m.body 
                })),
                { role: "system", content: \`\${dateContext}\\n\\n[CONTEXTO DEL CLIENTE]\\nTeléfono real para usar en etiqueta [TELEFONO: ...]: \${fromPhone.split('@')[0].split('_')[0]}\\n\\nRECORDATORIO DE EMERGENCIA Y REGLA ABSOLUTA: 1) Si el cliente pide EXPLÍCITAMENTE precios o pagos en una moneda EXTRANJERA que no está en tu catálogo (ej. pide pagar en dólares pero solo tienes quetzales). 2) Si el cliente pide ver fotos, imagenes o videos reales del producto. EN CUALQUIERA DE ESTOS DOS CASOS, ESTÁ ESTRICTAMENTE PROHIBIDO DAR EXPLICACIONES O DISCULPARTE. TU ÚNICA SALIDA PERMITIDA es escribir exactamente la etiqueta [APAGAR_BOT_SOPORTE] y nada más, para que un humano asuma el control. NUNCA te apagues si solo te piden un combo o información normal.\` },
                { role: "user", content: message } ]`;

const funcIdx = code.indexOf('async function getAIResponse');
const startIdx = code.indexOf('messages: [', funcIdx);
const endIdx = code.indexOf('{ role: "user", content: message } ]', startIdx);
if (startIdx !== -1 && endIdx !== -1) {
    const endStr = '{ role: "user", content: message } ]';
    const oldBlock = code.substring(startIdx, endIdx + endStr.length);
    code = code.replace(oldBlock, replaceStr);
}

fs.writeFileSync('server/index.js', code);
console.log("Done");
