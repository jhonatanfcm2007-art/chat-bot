const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

const regex = /\s*useEffect\(\(\) => \{\s*setSelectedFile\(null\);\s*setFilePreview\(''\);\s*if \(fileInputRef\.current\) fileInputRef\.current\.value = '';\s*\}, \[selectedChat\]\);/g;

code = code.replace(regex, '');

fs.writeFileSync('src/components/Simulator.jsx', code);
console.log('Replaced with regex');
