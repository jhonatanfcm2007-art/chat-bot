import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

content = content.replace('res.status(200).json({ received: true }););', 'res.status(200).json({ received: true });');

fs.writeFileSync('server/index.js', content);
console.log("Syntax fixed");
