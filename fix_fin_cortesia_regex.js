import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const interceptionLogic = `
    // --- FIN CORTESIA (Evitar bucles de agradecimientos) ---
    if (/\\[FIN_CORTESIA\\]/i.test(aiReply)) {
        // No enviamos nada al cliente, solo cortamos el bucle.
        const cName = refreshedChat.customerName || refreshedChat.orderName || 'Cliente';
        console.log(\`[SISTEMA] Bucle de cortesía evitado con \${cName}.\`);
        return;
    }
`;

content = content.replace(/(\/\/ No enviamos nada al cliente\r?\n\s*return;\r?\n\s*\})/g, "$1\n" + interceptionLogic);

fs.writeFileSync('server/index.js', content);
