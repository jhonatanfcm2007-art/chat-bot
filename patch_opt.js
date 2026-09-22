import fs from 'fs';
let content = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

const regex = /const success = await onSendMessage\(\{[\s\S]*?if\s*\(success\)\s*\{\s*setInputValue\(''\);/g;

const replacement = `const currentInput = inputValue;
      setInputValue('');
      const textarea = document.querySelector('textarea');
      if (textarea) textarea.style.height = 'auto';

      const success = await onSendMessage({ 
        to: selectedChat, 
        content: currentInput, 
        imageUrl: uploadedImageUrl,
        origin: window.location.origin
      });
      
      if (success) {`;

if (content.match(regex)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/components/Simulator.jsx', content);
    console.log("Patched optimistic clear with regex");
} else {
    console.log("Regex not found");
}
