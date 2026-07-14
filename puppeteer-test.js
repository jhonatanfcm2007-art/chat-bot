import puppeteer from 'puppeteer';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  console.log('Navigating to live URL...');
  await page.goto('https://backend-production-3b17.up.railway.app', { waitUntil: 'networkidle2' });
  
  console.log('Page loaded. Waiting 3 seconds...');
  await new Promise(r => setTimeout(r, 3000));
  
  await browser.close();
  console.log('Done.');
})();
