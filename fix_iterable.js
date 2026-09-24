import fs from 'fs';
let content = fs.readFileSync('playwright-service/index.js', 'utf8');

content = content.replace(
    "const rows = await page.$('table tbody tr');",
    "const rows = await page.$$('table tbody tr');"
);

content = content.replace(
    "const cells = await row.$('td');",
    "const cells = await row.$$('td');"
);

fs.writeFileSync('playwright-service/index.js', content);
