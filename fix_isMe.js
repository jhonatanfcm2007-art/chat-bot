import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

content = content.replace("m.role === 'user' ? 'Cliente' : 'Asesor/Bot'", "!m.isMe ? 'Cliente' : 'Asesor/Bot'");

fs.writeFileSync('server/index.js', content);
console.log("Fixed chat message mapping logic");
