const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

const handleFileStart = code.indexOf('const handleFileChange = (e) => {');
if (handleFileStart !== -1) {
    const endIdx = code.indexOf('};', handleFileStart) + 2;
    const block = code.substring(handleFileStart, endIdx);
    code = code.replace(block, '');
    fs.writeFileSync('src/components/Simulator.jsx', code);
    console.log('Removed handleFileChange');
}
