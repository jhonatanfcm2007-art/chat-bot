const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

const target = `    await onSendMessage({ 
      to: selectedChat, 
      content: text, 
      imageUrl: uploadedImageUrl 
    });`;

const replacement = `    await onSendMessage({ 
      to: selectedChat, 
      content: text, 
      imageUrl: uploadedImageUrl,
      origin: window.location.origin
    });`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/components/Simulator.jsx', code);
    console.log("Patched Simulator");
} else {
    console.log("Target not found");
}
