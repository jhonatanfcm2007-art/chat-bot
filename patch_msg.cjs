const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const oldMessagesStr = `messages: [
                { role: "system", content: \`\${settings[waLine]?.systemPrompt || settings["1"].systemPrompt}\\n\\n\${knowledgeContext}\${globalRules}\${dateContext}\` },
                                ...history.map(m => ({ 
                    role: m.role === 'user' ? 'user' : (m.role === 'system' ? 'system' : 'assistant'), 
                    content: m.content || m.body 
                })),
                { role: "system", content: "RECORDATORIO DE EMERGENCIA Y REGLA ABSOLUTA: 1) Si el cliente pide EXPLÍCITAMENTE precios o pagos en una moneda EXTRANJERA que no está en tu catálogo (ej. pide pagar en dólares pero solo tienes quetzales). 2) Si el cliente pide ver fotos, imagenes o videos reales del producto. EN CUALQUIERA DE ESTOS DOS CASOS, ESTÁ ESTRICTAMENTE PROHIBIDO DAR EXPLICACIONES O DISCULPARTE. TU ÚNICA SALIDA PERMITIDA es escribir exactamente la etiqueta [APAGAR_BOT_SOPORTE] y nada más, para que un humano asuma el control. NUNCA te apagues si solo te piden un combo o información normal." },
                { role: "user", content: message } ]`;

const startIdx = code.indexOf('messages: [');
const endIdx = code.indexOf('{ role: "user", content: message } ]', startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const endStr = '{ role: "user", content: message } ]';
    const oldBlock = code.substring(startIdx, endIdx + endStr.length);
    
    const newBlock = `messages: [
                { role: "system", content: \`\${settings[waLine]?.systemPrompt || settings["1"].systemPrompt}\\n\\n\${knowledgeContext}\${globalRules}\` },
                ...history.map(m => ({ 
                    role: m.role === 'user' ? 'user' : (m.role === 'system' ? 'system' : 'assistant'), 
                    content: m.content || m.body 
                })),
                { role: "system", content: \`\${dateContext}\\n\\n[CONTEXTO DEL CLIENTE]\\nTeléfono real para usar en etiqueta [TELEFONO: ...]: \${fromPhone.split('@')[0].split('_')[0]}\\n\\nRECORDATORIO DE EMERGENCIA Y REGLA ABSOLUTA: 1) Si el cliente pide EXPLÍCITAMENTE precios o pagos en una moneda EXTRANJERA que no está en tu catálogo (ej. pide pagar en dólares pero solo tienes quetzales). 2) Si el cliente pide ver fotos, imagenes o videos reales del producto. EN CUALQUIERA DE ESTOS DOS CASOS, ESTÁ ESTRICTAMENTE PROHIBIDO DAR EXPLICACIONES O DISCULPARTE. TU ÚNICA SALIDA PERMITIDA es escribir exactamente la etiqueta [APAGAR_BOT_SOPORTE] y nada más, para que un humano asuma el control. NUNCA te apagues si solo te piden un combo o información normal.\` },
                { role: "user", content: message } ]`;

    code = code.replace(oldBlock, newBlock);
    fs.writeFileSync('server/index.js', code);
    console.log("Patched successfully");
} else {
    console.log("Could not find the block");
}
