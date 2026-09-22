import fs from 'fs';
let content = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

const target = `      const success = await onSendMessage({ 
        to: selectedChat, 
        content: inputValue, 
        imageUrl: uploadedImageUrl,
        origin: window.location.origin
      });
      
      if (success) {
        setInputValue('');
        setSelectedFile(null);
        setFilePreview('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }`;

const fix = `      const currentInput = inputValue;
      setInputValue('');
      
      const success = await onSendMessage({ 
        to: selectedChat, 
        content: currentInput, 
        imageUrl: uploadedImageUrl,
        origin: window.location.origin
      });
      
      if (success) {
        setSelectedFile(null);
        setFilePreview('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setInputValue(currentInput); // Revert on failure
      }`;

if (content.includes('const success = await onSendMessage({')) {
    content = content.replace(target, fix);
    fs.writeFileSync('src/components/Simulator.jsx', content);
    console.log("Patched Simulator to clear input optimistically");
} else {
    console.log("Target not found");
}
