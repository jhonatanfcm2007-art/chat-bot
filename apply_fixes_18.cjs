const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

const regex = /chat\.tags = \(chat\.tags \|\| \[\]\)\.filter\(t => t !== 'preparar_pedido'\);\s+if \(!chat\.tags\.includes\('guia_enviada'\)\) \{\s+chat\.tags\.push\('guia_enviada'\);\s+\}\s+saveChats\(chats\);\s+io\.emit\('initial_chats', getOptimizedChatsPayload\(\)\);/s;

const replacement = `chat.tags = (chat.tags || []).filter(t => t !== 'preparar_pedido');
        if (!chat.tags.includes('guia_enviada')) {
            chat.tags.push('guia_enviada');
        }
        
        saveChats(chats);
        io.emit('chat_updated', chats[chatId]);`;

if (regex.test(c)) {
    c = c.replace(regex, replacement);
    fs.writeFileSync('server/index.js', c);
    console.log("Inyección exitosa en save-tracking.");
} else {
    console.log("No se encontró save-tracking.");
}
