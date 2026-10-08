import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));
  
  await page.goto('https://backend-production-3b17.up.railway.app');
  
  await page.waitForTimeout(4000);
  
  // take screenshot just in case
  await page.screenshot({ path: 'live_debug.png' });
  
  await browser.close();
})();
