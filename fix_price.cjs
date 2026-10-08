const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const startStr = "const parseSafePrice = (str) => {";
const startIdx = code.indexOf(startStr);

if (startIdx !== -1) {
    const endStr = "return parseFloat(clean);";
    const endIdxBase = code.indexOf(endStr, startIdx);
    const endIdx = code.indexOf("}", endIdxBase) + 1;
    
    const oldBlock = code.substring(startIdx, endIdx);
    const newBlock = `const parseSafePrice = (str) => {
                let clean = String(str).trim().replace(/[^0-9.,]/g, '');
                if (!clean) return 0;
                const lastComma = clean.lastIndexOf(',');
                const lastDot = clean.lastIndexOf('.');
                if (lastComma !== -1 && lastDot !== -1) {
                    if (lastComma > lastDot) clean = clean.replace(/\\./g, '').replace(',', '.');
                    else clean = clean.replace(/,/g, '');
                } else if (lastComma !== -1) {
                    if (clean.length - 1 - lastComma === 3) clean = clean.replace(/,/g, '');
                    else clean = clean.replace(',', '.');
                } else if (lastDot !== -1) {
                    if (clean.length - 1 - lastDot === 3) clean = clean.replace(/\\./g, '');
                }
                return parseFloat(clean);
            }`;
    
    code = code.replace(oldBlock, newBlock);
    fs.writeFileSync('server/index.js', code);
    console.log("Successfully replaced parseSafePrice block");
} else {
    console.log("Could not find start");
}
