const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const badBlock = `if (cleanWebhookId === PHONE_ID_6) {
                waLineStr = '6';
                sysPrompt = settings['6']?.systemPrompt || sysPrompt;
            } else if (cleanWebhookId === PHONE_ID_5) {`;

const goodBlock = `if (cleanWebhookId === PHONE_ID_6) {
                currentChat.waLine = 6;
            } else if (cleanWebhookId === PHONE_ID_5) {`;

if (code.includes(badBlock)) {
    code = code.replace(badBlock, goodBlock);
    fs.writeFileSync('server/index.js', code);
    console.log('Fixed bad block in server/index.js');
} else {
    console.log('Bad block not found!');
}
