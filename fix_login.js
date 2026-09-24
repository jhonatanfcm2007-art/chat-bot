import fs from 'fs';
let content = fs.readFileSync('playwright-service/index.js', 'utf8');
content = content.replace(
    /const submitBtn = await page\.\$\('button\[type="submit"\].*?\}\n        \}/s,
    `await passInput.press('Enter');
            await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        }`
);
fs.writeFileSync('playwright-service/index.js', content);
console.log("Replaced");
