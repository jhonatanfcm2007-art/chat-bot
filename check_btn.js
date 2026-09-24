import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('https://app.dropi.hn/login', { waitUntil: 'networkidle' });
    const btn = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.map(b => b.outerHTML);
    });
    console.log("DROPI HN BUTTONS:", btn);
  } catch(e) { console.log(e.message) }

  try {
    await page.goto('https://app.soydrop.com/login', { waitUntil: 'networkidle' });
    const btn2 = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.map(b => b.outerHTML);
    });
    console.log("SOYDROP COM BUTTONS:", btn2);
  } catch(e) { console.log(e.message) }

  await browser.close();
})();
