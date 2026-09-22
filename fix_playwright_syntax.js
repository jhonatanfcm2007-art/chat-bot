import fs from 'fs';
let content = fs.readFileSync('playwright-service/index.js', 'utf8');

// The backticks were escaped literally like \`
content = content.replace(/\\\`/g, "`");

fs.writeFileSync('playwright-service/index.js', content);
console.log("Fixed syntax error in playwright-service/index.js");
