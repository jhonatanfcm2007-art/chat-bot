const fs = require('fs');

function patchBackend() {
    let code = fs.readFileSync('server/index.js', 'utf8');

    // 1. Env vars
    if (!code.includes('const PHONE_ID_7')) {
        code = code.replace(
            "const PHONE_ID_6 = (process.env.WHATSAPP_PHONE_ID_6 || process.env.PHONE_ID_6 || '').trim();",
            "const PHONE_ID_6 = (process.env.WHATSAPP_PHONE_ID_6 || process.env.PHONE_ID_6 || '').trim();\nconst PHONE_ID_7 = (process.env.WHATSAPP_PHONE_ID_7 || process.env.PHONE_ID_7 || '').trim();\nconst PHONE_ID_8 = (process.env.WHATSAPP_PHONE_ID_8 || process.env.PHONE_ID_8 || '').trim();"
        );
    }

    // 2. getTokenAndPhone forceLine
    if (!code.includes('forceLine === 7')) {
        code = code.replace(
            "if (forceLine === 6 && WHATSAPP_TOKEN_6 && PHONE_ID_6) return { token: WHATSAPP_TOKEN_6, phoneId: PHONE_ID_6, line: 6 };",
            "if (forceLine === 8 && WHATSAPP_TOKEN_8 && PHONE_ID_8) return { token: WHATSAPP_TOKEN_8, phoneId: PHONE_ID_8, line: 8 };\n    if (forceLine === 7 && WHATSAPP_TOKEN_7 && PHONE_ID_7) return { token: WHATSAPP_TOKEN_7, phoneId: PHONE_ID_7, line: 7 };\n    if (forceLine === 6 && WHATSAPP_TOKEN_6 && PHONE_ID_6) return { token: WHATSAPP_TOKEN_6, phoneId: PHONE_ID_6, line: 6 };"
        );
    }

    // 3. getTokenAndPhone chat?.waLine
    if (!code.includes('chat?.waLine === 7')) {
        code = code.replace(
            "if (chat?.waLine === 6 && WHATSAPP_TOKEN_6 && PHONE_ID_6) { return { token: WHATSAPP_TOKEN_6, phoneId: PHONE_ID_6, line: 6 }; }",
            "if (chat?.waLine === 8 && WHATSAPP_TOKEN_8 && PHONE_ID_8) { return { token: WHATSAPP_TOKEN_8, phoneId: PHONE_ID_8, line: 8 }; }\n    if (chat?.waLine === 7 && WHATSAPP_TOKEN_7 && PHONE_ID_7) { return { token: WHATSAPP_TOKEN_7, phoneId: PHONE_ID_7, line: 7 }; }\n    if (chat?.waLine === 6 && WHATSAPP_TOKEN_6 && PHONE_ID_6) { return { token: WHATSAPP_TOKEN_6, phoneId: PHONE_ID_6, line: 6 }; }"
        );
    }

    // 4. Webhook line mapping
    code = code.replace(
        /const waLine = cleanWebhookId === PHONE_ID_6 \? 6 : \(cleanWebhookId === PHONE_ID_5/g,
        "const waLine = cleanWebhookId === PHONE_ID_8 ? 8 : (cleanWebhookId === PHONE_ID_7 ? 7 : (cleanWebhookId === PHONE_ID_6 ? 6 : (cleanWebhookId === PHONE_ID_5"
    );
    // adding missing closing parens at the end... Wait, regex replace might be safer.
    // Let's replace the EXACT string:
    const exactStr = "const waLine = cleanWebhookId === PHONE_ID_6 ? 6 : (cleanWebhookId === PHONE_ID_5 ? 5 : (cleanWebhookId === PHONE_ID_4 ? 4 : (cleanWebhookId === PHONE_ID_3 ? 3 : (cleanWebhookId === PHONE_ID_2 ? 2 : 1))));";
    const newStr = "const waLine = cleanWebhookId === PHONE_ID_8 ? 8 : (cleanWebhookId === PHONE_ID_7 ? 7 : (cleanWebhookId === PHONE_ID_6 ? 6 : (cleanWebhookId === PHONE_ID_5 ? 5 : (cleanWebhookId === PHONE_ID_4 ? 4 : (cleanWebhookId === PHONE_ID_3 ? 3 : (cleanWebhookId === PHONE_ID_2 ? 2 : 1)))))));";
    code = code.split(exactStr).join(newStr);

    // 5. emergency reset
    const emergencyStr = "if (cleanWebhookId === PHONE_ID_6) {\n            lineName = 'Línea 6';\n        } else if (cleanWebhookId === PHONE_ID_5) {";
    const emergencyNew = "if (cleanWebhookId === PHONE_ID_8) {\n            lineName = 'Línea 8';\n        } else if (cleanWebhookId === PHONE_ID_7) {\n            lineName = 'Línea 7';\n        } else if (cleanWebhookId === PHONE_ID_6) {\n            lineName = 'Línea 6';\n        } else if (cleanWebhookId === PHONE_ID_5) {";
    code = code.split(emergencyStr).join(emergencyNew);

    fs.writeFileSync('server/index.js', code);
    console.log("Backend patched!");
}

function patchFrontend() {
    // Sidebar
    let sidebar = fs.readFileSync('src/components/Sidebar.jsx', 'utf8');
    if (!sidebar.includes("val: 7")) {
        sidebar = sidebar.replace(
            "{ val: 6, label: 'Línea 6', icon: 'looks_6' },",
            "{ val: 6, label: 'Línea 6', icon: 'looks_6' },\n                { val: 7, label: 'Línea 7', icon: 'looks_one' },\n                { val: 8, label: 'Línea 8', icon: 'looks_two' },"
        );
        fs.writeFileSync('src/components/Sidebar.jsx', sidebar);
    }

    // UsersManager
    let users = fs.readFileSync('src/components/UsersManager.jsx', 'utf8');
    users = users.replace(/\[1, 2, 3, 4, 5, 6\]/g, "[1, 2, 3, 4, 5, 6, 7, 8]");
    fs.writeFileSync('src/components/UsersManager.jsx', users);

    // KnowledgeBase
    let kb = fs.readFileSync('src/components/KnowledgeBase.jsx', 'utf8');
    if (!kb.includes('Línea 7')) {
        kb = kb.replace(
            "p.line === '6' ? 'Línea 6' : 'Ambas Líneas'",
            "p.line === '6' ? 'Línea 6' : p.line === '7' ? 'Línea 7' : p.line === '8' ? 'Línea 8' : 'Ambas Líneas'"
        );
        kb = kb.replace(
            '<option value="6">Línea 6</option>',
            '<option value="6">Línea 6</option>\n                  <option value="7">Línea 7</option>\n                  <option value="8">Línea 8</option>'
        );
        fs.writeFileSync('src/components/KnowledgeBase.jsx', kb);
    }
    console.log("Frontend patched!");
}

patchBackend();
patchFrontend();
