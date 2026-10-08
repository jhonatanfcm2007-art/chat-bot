const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

code = code.replace(/if\s*\(\s*data\.success\s*\)\s*\{\s*uploadedImageUrl\s*=\s*data\.url;\s*\}/, 'if (data.url || data.success) { uploadedImageUrl = data.url; }');

fs.writeFileSync('src/components/Simulator.jsx', code);
console.log("Successfully replaced block with regex");
