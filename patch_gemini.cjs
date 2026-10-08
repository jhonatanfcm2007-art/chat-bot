const fs = require('fs');
let code = fs.readFileSync('server/services/geoNormalizer.js', 'utf8');

if (code.includes("model: 'gemini-1.5-pro'")) {
    code = code.replace("model: 'gemini-1.5-pro'", "model: 'gemini-1.5-flash'");
    fs.writeFileSync('server/services/geoNormalizer.js', code);
    console.log("Patched to gemini-1.5-flash!");
} else {
    console.log("Could not find gemini-1.5-pro in the file.");
}
