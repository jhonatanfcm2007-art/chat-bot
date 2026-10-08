const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');
if (!code.includes('const WHATSAPP_TOKEN_7')) {
    code = code.replace(
        "const WHATSAPP_TOKEN_6 = (process.env.WHATSAPP_TOKEN_6 || '').trim();",
        "const WHATSAPP_TOKEN_6 = (process.env.WHATSAPP_TOKEN_6 || '').trim();\nconst WHATSAPP_TOKEN_7 = (process.env.WHATSAPP_TOKEN_7 || '').trim();\nconst WHATSAPP_TOKEN_8 = (process.env.WHATSAPP_TOKEN_8 || '').trim();"
    );
    fs.writeFileSync('server/index.js', code);
    console.log("Tokens added!");
}
