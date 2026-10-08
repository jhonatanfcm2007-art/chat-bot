const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

const effectToRemove = `  useEffect(() => {
    setSelectedFile(null);
    setFilePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [selectedChat]);`;

code = code.replace(effectToRemove, '');
fs.writeFileSync('src/components/Simulator.jsx', code);
console.log('Fixed setSelectedFile ReferenceError');
