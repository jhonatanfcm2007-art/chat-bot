import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// Reduce chat history passed to AI from 35 to 12
content = content.replace("const allMessages = refreshedChat.messages.slice(-35);", "const allMessages = refreshedChat.messages.slice(-12); // Token optimization");

fs.writeFileSync('server/index.js', content);
console.log("Updated history slice to reduce token usage.");
