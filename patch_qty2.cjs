const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const regex = /let orderQty = 1;[\s\S]*?orderQty = parseInt\(qtyMatch\[1\], 10\);\s*\}/;

const replacement = `let orderQty = 1;
        const promoMatch = products.match(/\\b([1-9]\\d*)\\s*x\\s*[1-9]\\d*\\b/i);
        if (promoMatch) {
            orderQty = parseInt(promoMatch[1], 10);
        } else {
            const qtyMatch = products.match(/(?:\\s+x\\s*|combo\\s*|pack\\s*)([1-9]\\d*)/i) || 
                             products.match(/\\b([1-9]\\d*)\\s*(?:frasco|tarro|unidad|unidades|combo|crema|caja|botella|pz|pieza)/i) ||
                             products.match(/x\\s*([1-9]\\d*)$/i) ||
                             products.match(/\\b([1-9]\\d*)\\s*x\\b/i) ||
                             products.match(/^([1-9]\\d*)\\s+/);
            if (qtyMatch && qtyMatch[1]) {
                orderQty = parseInt(qtyMatch[1], 10);
            }
        }`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('server/index.js', code);
    console.log("Patched orderQty logic using regex!");
} else {
    console.log("Regex didn't match.");
}
