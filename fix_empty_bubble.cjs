const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const oldMsg = `const newMsg = {
                id: msgId,
                isMe: true,
                body: messageText,
                time: new Date().toLocaleTimeString('es-CO')
            };`;
const newMsg = `const newMsg = {
                id: msgId,
                isMe: true,
                body: messageText,
                content: messageText,
                timestampRaw: Date.now(),
                time: new Date().toLocaleTimeString('es-CO')
            };`;
code = code.replace(oldMsg, newMsg);

const oldAuto = `chat.messages.push({
                            id: order.guideMessageId,
                            isMe: true,
                            body: msg,
                            time: new Date().toLocaleTimeString('es-CO')
                        });`;
const newAuto = `chat.messages.push({
                            id: order.guideMessageId,
                            isMe: true,
                            body: msg,
                            content: msg,
                            timestampRaw: Date.now(),
                            time: new Date().toLocaleTimeString('es-CO')
                        });`;
code = code.replace(oldAuto, newAuto);

fs.writeFileSync('server/index.js', code);
console.log('Fixed message structure in server');
