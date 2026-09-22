import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const regexTarget = `const qtyMatch = products.match(/(?:x\\s*|combo\\s*|pack\\s*)([2-9])/i) || 
                         products.match(/([2-9])\\s*(?:frasco|tarro|unidad|combo|crema|caja|botella|x)/i);`;

const regexFix = `const qtyMatch = products.match(/(?:\\s+x\\s*|combo\\s*|pack\\s*)([1-9]\\d*)/i) || 
                         products.match(/\\b([1-9]\\d*)\\s*(?:frasco|tarro|unidad|combo|crema|caja|botella)/i) ||
                         products.match(/x\\s*([1-9]\\d*)$/i);`;

// Let's use a regex replace because of whitespace formatting in the file
const fileRegex = /const qtyMatch = products\.match\(\/\(\?:x\\s\*\|combo\\s\*\|pack\\s\*\)\(\[2-9\]\)\/i\) \|\|\s*products\.match\(\/\(\[2-9\]\)\\s\*\(\?:frasco\|tarro\|unidad\|combo\|crema\|caja\|botella\|x\)\/i\);/g;

if (content.match(fileRegex)) {
    content = content.replace(fileRegex, regexFix);
    fs.writeFileSync('server/index.js', content);
    console.log("Patched qtyMatch regex");
} else {
    // If exact whitespace matching failed, let's just do a string replace of the first part
    const manualTarget = "const qtyMatch = products.match(/(?:x\\s*|combo\\s*|pack\\s*)([2-9])/i) || \n                         products.match(/([2-9])\\s*(?:frasco|tarro|unidad|combo|crema|caja|botella|x)/i);";
    if (content.includes("products.match(/([2-9])\\s*(?:frasco|tarro|unidad|combo|crema|caja|botella|x)/i)")) {
        content = content.replace(/const qtyMatch = products\.match\(\/\(\?:x\\s\*\|combo\\s\*\|pack\\s\*\)\(\[2-9\]\)\/i\) \|\| \r?\n\s*products\.match\(\/\(\[2-9\]\)\\s\*\(\?:frasco\|tarro\|unidad\|combo\|crema\|caja\|botella\|x\)\/i\);/, regexFix);
        fs.writeFileSync('server/index.js', content);
        console.log("Patched qtyMatch regex (fallback string replace)");
    } else {
        console.log("Failed to find target");
    }
}
