const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /\/\/ Evitar duplicados por ID\s*if \(currentChat\.messages\.some\(m => m\.id === message\.id\)\) return prev;\s*return \{\s*\.\.\.prev,\s*\[chatId\]: \{\s*\.\.\.currentChat,\s*updatedAt: Date\.now\(\),\s*messages: \[\.\.\.currentChat\.messages, \{\s*\.\.\.message,\s*content: message\.body,\s*timestampRaw: Date\.now\(\),\s*role: message\.role \|\| \(message\.isMe \? 'bot' : 'user'\)\s*\}\]\s*\}\s*\};\s*\}\);/g;

const replacement = `// Evitar duplicados por ID
        if (currentChat.messages.some(m => m.id === message.id)) return prev;

        // Limpiar mensaje optimista si coincide el texto
        const cleanedMessages = currentChat.messages.filter(m => 
          !(m.status === 'sending' && String(m.id).startsWith('opt-') && m.body === message.body)
        );

        return {
          ...prev,
          [chatId]: {
            ...currentChat,
            updatedAt: Date.now(),
            messages: [...cleanedMessages, { 
              ...message, 
              content: message.body, 
              timestampRaw: Date.now(),
              role: message.role || (message.isMe ? 'bot' : 'user') 
            }]
          }
        };
      });`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.jsx', code);
    console.log("Patched App.jsx successfully!");
} else {
    console.log("Could not match regex in App.jsx");
}
