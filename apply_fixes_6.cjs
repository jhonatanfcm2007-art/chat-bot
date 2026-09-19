const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

c = c.replace(
    /let finalPhone = chat\.orderPhone \? String\(chat\.orderPhone\)\.replace\(\/\\D\/g, ''\) : chat\.from\.replace\(\/\\D\/g, ''\);/g,
    `let finalPhone = chat.orderPhone ? String(chat.orderPhone).replace(/\\D/g, '') : chat.from.split('@')[0].split('_')[0].replace(/\\D/g, '');`
);

fs.writeFileSync('server/index.js', c);
