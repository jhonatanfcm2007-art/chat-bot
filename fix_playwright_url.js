import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

content = content.replace(
    /let serviceUrl = process\.env\.PLAYWRIGHT_SERVICE_URL;\r?\n\s*if \(!serviceUrl\) \{\r?\n\s*return res\.status\(500\)\.json\(\{ error: "Falta configurar PLAYWRIGHT_SERVICE_URL en este backend principal\." \}\);\r?\n\s*\}/,
    `let serviceUrl = process.env.PLAYWRIGHT_SERVICE_URL || 'http://localhost:3001';`
);

fs.writeFileSync('server/index.js', content);
