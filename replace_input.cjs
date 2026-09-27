const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

if (!code.includes('import ChatInput')) {
    code = code.replace("import React", "import ChatInput from './ChatInput';\nimport React");
}

code = code.replace(/\s*const \[inputValue, setInputValue\] = useState\(''\);/, '');
code = code.replace(/\s*const \[selectedFile, setSelectedFile\] = useState\(null\);/, '');
code = code.replace(/\s*const \[filePreview, setFilePreview\] = useState\(''\);/, '');
code = code.replace(/\s*const fileInputRef = useRef\(null\);/, '');

const newHandleSendStr = `  const handleSend = async (text, file, preview) => {
    if ((!text.trim() && !preview) || !selectedChat) return;
    
    let uploadedImageUrl = null;
    
    if (file) {
      try {
        const response = await fetch(\`\${serverUrl}/api/upload\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            base64: preview
          })
        });
        const data = await response.json();
        if (data.success) {
          uploadedImageUrl = data.url;
        }
      } catch (error) {
        console.error('Error al subir imagen:', error);
      }
    }
    
    await onSendMessage({ 
      to: selectedChat, 
      content: text, 
      imageUrl: uploadedImageUrl 
    });
  };`;

const handleSendStart = code.indexOf('const handleSend = async () => {');
if (handleSendStart !== -1) {
    // Find the end of handleSend block
    const awaitOnSendIndex = code.indexOf('await onSendMessage({', handleSendStart);
    const endBlockIndex = code.indexOf('};', awaitOnSendIndex) + 2;
    const oldBlock = code.substring(handleSendStart, endBlockIndex);
    code = code.replace(oldBlock, newHandleSendStr);
}

const footerStartStr = '<footer className="p-4 bg-white border-t border-outline-variant">';
const footerIdx = code.indexOf(footerStartStr);
if (footerIdx !== -1) {
    const endFooterIdx = code.indexOf('</footer>', footerIdx) + 9;
    const footerBlock = code.substring(footerIdx, endFooterIdx);
    code = code.replace(footerBlock, `<ChatInput onSend={handleSend} isBlocked={activeChatData.isBlocked} />`);
} else {
    // Maybe it has extra classes
    console.log("Footer not found by exact match, let's try regex");
    const footerRegex = /<footer className="p-4 bg-white border-t border-outline-variant[\s\S]*?<\/footer>/;
    code = code.replace(footerRegex, `<ChatInput onSend={handleSend} isBlocked={activeChatData.isBlocked} />`);
}

fs.writeFileSync('src/components/Simulator.jsx', code);
console.log('Replaced Input successfully');
