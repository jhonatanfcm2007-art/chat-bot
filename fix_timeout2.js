import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// Replace { role: "user", content: message } ] }); with ] }, { timeout: 15000 });
content = content.replace(/\{\s*role:\s*"user",\s*content:\s*message\s*\}\s*\]\s*\}\);/, '{ role: "user", content: message } ] }, { timeout: 15000 });');

fs.writeFileSync('server/index.js', content);
console.log("Patched correctly");
