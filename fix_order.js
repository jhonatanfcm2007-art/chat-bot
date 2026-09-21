import fs from 'fs';

let content = fs.readFileSync('server/index.js', 'utf8');

const target = `            if (isComplete) {
                refreshedChat.orderRegistered = true;
                refreshedChat.tags = ['preparar_pedido'];
                io.emit('tag_updated', { from, tags: refreshedChat.tags });
                saveChats(chats);
            }`;

if (content.includes(target)) {
    content = content.replace(target, '');
    fs.writeFileSync('server/index.js', content);
    console.log("Bug removed!");
} else {
    console.log("Target not found!");
}
