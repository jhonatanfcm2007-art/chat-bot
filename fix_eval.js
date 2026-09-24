import fs from 'fs';
let content = fs.readFileSync('playwright-service/index.js', 'utf8');

content = content.replace(
    "const headers = await page.$eval('table thead th', ths => ths.map(th => th.innerText.toLowerCase()));",
    "const headers = await page.$$eval('table thead th', ths => ths.map(th => th.innerText.toLowerCase()));"
);

fs.writeFileSync('playwright-service/index.js', content);
