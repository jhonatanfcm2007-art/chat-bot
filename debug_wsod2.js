import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  await page.goto('http://localhost:3000');
  
  // Login
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', '123');
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(4000);
  
  await browser.close();
})();
