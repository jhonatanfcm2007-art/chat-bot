const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const regex = /const lastUserMsg = refreshedChat\.messages\.filter\(m => m\.role === 'user'\)\.slice\(-1\)\[0\];\s*if \(!lastUserMsg\) return;\s*const msgBodyLower = \(lastUserMsg\.content \|\| ''\)\.toLowerCase\(\)\.trim\(\);/;

const replacement = `const lastUserMsg = refreshedChat.messages.filter(m => m.role === 'user').slice(-1)[0];
        if (!lastUserMsg) return;

        const msgBodyLower = (lastUserMsg.content || '').toLowerCase().trim();
        
        // Ignorar reacciones para evitar que el bot responda
        if (msgBodyLower.startsWith('[reacción:')) {
            console.log(\`ℹ️ [SISTEMA] Ignorando respuesta de IA porque es una reacción.\`);
            delete aiTimers[from];
            return;
        }

        // Ignorar mensajes cortos de cortesía/despedida que causan bucles
        const cortesia = ['gracias', 'muchas gracias', 'gracias bendiciones', 'bendiciones', 'ok', 'ok gracias', 'perfecto', 'excelente', 'bueno', 'listo', 'dale', 'okey'];
        if (cortesia.includes(msgBodyLower.replace(/[^a-záéíóúñ ]/g, '').trim())) {
            console.log(\`ℹ️ [SISTEMA] Ignorando respuesta de IA porque es un mensaje corto de cortesía (\${msgBodyLower}).\`);
            delete aiTimers[from];
            return;
        }`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('server/index.js', code);
    console.log("Patched handleIncomingMessage for reactions and courtesy!");
} else {
    console.log("Regex not found in handleIncomingMessage");
}
