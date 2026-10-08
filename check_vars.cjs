const fs = require('fs');
const code = fs.readFileSync('server/index.js', 'utf8');

const regex = /const globalRules = `([\s\S]*?)`;/;
const match = code.match(regex);
if (match) {
    const rules = match[1];
    const variables = rules.match(/\$\{.*?\}/g);
    console.log("Variables found in globalRules:", variables);
}
