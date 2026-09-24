import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// 1. Add FIN_CORTESIA to the regex so it gets stripped from the message text if it accidentally slips through
content = content.replace(
    /\|ABANDONADO\)/g,
    "|ABANDONADO|FIN_CORTESIA)"
);

// 2. Add the interception block right after the SOPORTE_SILENCIOSO block.
// Let's find SOPORTE_SILENCIOSO logic.
const soporteStr = `        // No enviamos nada al cliente
        return;
    }`;

const interceptionLogic = `
    // --- FIN CORTESIA (Evitar bucles de agradecimientos) ---
    if (/\\[FIN_CORTESIA\\]/i.test(aiReply)) {
        // No enviamos nada al cliente, solo cortamos el bucle.
        const cName = refreshedChat.customerName || refreshedChat.orderName || 'Cliente';
        console.log(\`[SISTEMA] Bucle de cortesía evitado con \${cName}.\`);
        return;
    }`;

// Replace the FIRST occurrence of `return; }` after SOPORTE_SILENCIOSO with the interception logic.
// Alternatively, let's just use string replace on a very specific snippet.
const target = `// No enviamos nada al cliente
        return;
    }`;
content = content.replace(target, target + "\n" + interceptionLogic);

fs.writeFileSync('server/index.js', content);
console.log("Fixed FIN_CORTESIA interception!");
