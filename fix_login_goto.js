import fs from 'fs';
let content = fs.readFileSync('playwright-service/index.js', 'utf8');

content = content.replace(
    /await page\.goto\(loginUrl, \{ waitUntil: 'networkidle', timeout: 30000 \}\);/g,
    "await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });"
);

fs.writeFileSync('playwright-service/index.js', content);
