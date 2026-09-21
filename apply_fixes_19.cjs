const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

const regex = /chat\.tags = \(chat\.tags \|\| \[\]\)\.filter\(t => t !== 'preparar_pedido'\);\s+if \(!chat\.tags\.includes\('guia_enviada'\)\) \{\s+chat\.tags\.push\('guia_enviada'\);\s+\}\s+const messageText = getTrackingMessage.*?\s+saveChats\(chats\);\s+io\.emit\('initial_chats', getOptimizedChatsPayload\(\)\);/s;

// It's safer to just replace `io.emit('initial_chats', getOptimizedChatsPayload());` inside `send_bulk_tracking` with a loop or just remove it, because we can just emit `chat_updated` inside the loop!

c = c.replace(/chat\.messages\.push\(newMsg\);\s*io\.emit\('message', \{ \.\.\.newMsg, waLine: chat\.waLine \}\);/g, "chat.messages.push(newMsg);\n                    io.emit('message', { ...newMsg, waLine: chat.waLine });\n                    io.emit('chat_updated', chat);");

c = c.replace(/saveChats\(chats\);\s*io\.emit\('initial_chats', getOptimizedChatsPayload\(\)\);/g, "saveChats(chats);");

fs.writeFileSync('server/index.js', c);
console.log("Inyección exitosa en bulk-tracking.");
