import fs from 'fs';

let content = fs.readFileSync('server/index.js', 'utf8');

const regex = /if\s*\(isComplete\)\s*\{\s*refreshedChat\.orderRegistered\s*=\s*true;\s*refreshedChat\.tags\s*=\s*\['preparar_pedido'\];\s*io\.emit\('tag_updated',\s*\{\s*from,\s*tags:\s*refreshedChat\.tags\s*\}\);\s*saveChats\(chats\);\s*\}/;

if (regex.test(content)) {
    content = content.replace(regex, '');
    fs.writeFileSync('server/index.js', content);
    console.log("Bug removed!");
} else {
    console.log("Target not found!");
}
