import fs from 'fs';
let content = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

const target = `      const currentInput = inputValue;
      setInputValue('');
      
      const success = await onSendMessage({`;

const fix = `      const currentInput = inputValue;
      setInputValue('');
      const textarea = document.querySelector('textarea');
      if (textarea) textarea.style.height = 'auto';
      
      const success = await onSendMessage({`;

if (content.includes('const currentInput = inputValue;')) {
    content = content.replace(target, fix);
    fs.writeFileSync('src/components/Simulator.jsx', content);
    console.log("Patched textarea shrink");
} else {
    console.log("Target not found");
}
