const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const targetStr = `    if (chat?.waLine === 5 && WHATSAPP_TOKEN_5 && PHONE_ID_5) {
        return { token: WHATSAPP_TOKEN_5, phoneId: PHONE_ID_5, line: 5 };
    }`;

const replaceStr = `    if (chat?.waLine === 6 && WHATSAPP_TOKEN_6 && PHONE_ID_6) {
        return { token: WHATSAPP_TOKEN_6, phoneId: PHONE_ID_6, line: 6 };
    }
    if (chat?.waLine === 5 && WHATSAPP_TOKEN_5 && PHONE_ID_5) {
        return { token: WHATSAPP_TOKEN_5, phoneId: PHONE_ID_5, line: 5 };
    }`;

if(code.includes(targetStr)) {
    code = code.replace(targetStr, replaceStr);
    fs.writeFileSync('server/index.js', code);
    console.log("Patched getWhatsAppCredentials for Line 6");
} else {
    console.log("Could not find targetStr");
}
