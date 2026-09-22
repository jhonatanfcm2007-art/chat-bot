import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

content = content.replace("const chat = db.chats.find(c => c.id === incident.chatId);", "const chat = chats[incident.chatId];");

fs.writeFileSync('server/index.js', content);
console.log("Fixed db.chats reference");
