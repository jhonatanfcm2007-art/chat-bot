const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

// 1. Env variables
const envFind = "const PHONE_ID_5 = (process.env.WHATSAPP_PHONE_ID_5 || process.env.PHONE_ID_5 || '').trim();";
const envReplace = envFind + "\nconst WHATSAPP_TOKEN_6 = (process.env.WHATSAPP_TOKEN_6 || '').trim();\nconst PHONE_ID_6 = (process.env.WHATSAPP_PHONE_ID_6 || process.env.PHONE_ID_6 || '').trim();";
code = code.replace(envFind, envReplace);

// 2. getWhatsAppCredentials
const credsFind1 = "if (forceLine === 5 && WHATSAPP_TOKEN_5 && PHONE_ID_5) return { token: WHATSAPP_TOKEN_5, phoneId: PHONE_ID_5, line: 5 };";
const credsReplace1 = "if (forceLine === 6 && WHATSAPP_TOKEN_6 && PHONE_ID_6) return { token: WHATSAPP_TOKEN_6, phoneId: PHONE_ID_6, line: 6 };\n    " + credsFind1;
code = code.replace(credsFind1, credsReplace1);

const credsFind2 = "if (chat?.waLine === 5 && WHATSAPP_TOKEN_5 && PHONE_ID_5) {\n        return { token: WHATSAPP_TOKEN_5, phoneId: PHONE_ID_5, line: 5 };\n    }";
const credsReplace2 = "if (chat?.waLine === 6 && WHATSAPP_TOKEN_6 && PHONE_ID_6) {\n        return { token: WHATSAPP_TOKEN_6, phoneId: PHONE_ID_6, line: 6 };\n    }\n    " + credsFind2;
code = code.replace(credsFind2, credsReplace2);

// 3. Webhook logic
const webhookFind1 = "const waLine = cleanWebhookId === PHONE_ID_5 ? 5 : (cleanWebhookId === PHONE_ID_4 ? 4 : (cleanWebhookId === PHONE_ID_3 ? 3 : (cleanWebhookId === PHONE_ID_2 ? 2 : 1)));";
const webhookReplace1 = "const waLine = cleanWebhookId === PHONE_ID_6 ? 6 : (cleanWebhookId === PHONE_ID_5 ? 5 : (cleanWebhookId === PHONE_ID_4 ? 4 : (cleanWebhookId === PHONE_ID_3 ? 3 : (cleanWebhookId === PHONE_ID_2 ? 2 : 1))));";
code = code.replaceAll(webhookFind1, webhookReplace1);

const debugFind = "Line 5: '${PHONE_ID_5}'`);";
const debugReplace = "Line 5: '${PHONE_ID_5}' | Line 6: '${PHONE_ID_6}'`);";
code = code.replace(debugFind, debugReplace);

const syncFind = "if (cleanWebhookId === PHONE_ID_5) {";
const syncReplace = "if (cleanWebhookId === PHONE_ID_6) {\n                waLineStr = '6';\n                sysPrompt = settings['6']?.systemPrompt || sysPrompt;\n            } else if (cleanWebhookId === PHONE_ID_5) {";
code = code.replace(syncFind, syncReplace);

fs.writeFileSync('server/index.js', code);
console.log('server/index.js patched for Line 6');
