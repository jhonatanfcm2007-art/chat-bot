const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

const oldBlock = `        const data = await response.json();
        if (data.success) {
          uploadedImageUrl = data.url;
        }`;

const newBlock = `        const data = await response.json();
        if (data.url) {
          uploadedImageUrl = data.url;
        }`;

if (code.includes(oldBlock)) {
    code = code.replace(oldBlock, newBlock);
    fs.writeFileSync('src/components/Simulator.jsx', code);
    console.log("Successfully replaced block");
} else {
    console.log("Block not found");
}
