const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

code = code.replace(/await onSendMessage\(\{\s*to: selectedChat,\s*content: text,\s*imageUrl: uploadedImageUrl\s*\}\);/, `await onSendMessage({ 
      to: selectedChat, 
      content: text, 
      imageUrl: uploadedImageUrl,
      origin: window.location.origin
    });`);

fs.writeFileSync('src/components/Simulator.jsx', code);
console.log("Patched Simulator with regex");
