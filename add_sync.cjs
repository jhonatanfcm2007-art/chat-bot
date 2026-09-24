const fs = require('fs');
let code = fs.readFileSync('playwright-service/index.js', 'utf8');

const syncEndpoint = `
app.post('/api/soydrop/sync-recent-orders', async (req, res) => {
    const loginUrl = process.env.SOYDROP_LOGIN_URL || 'https://app.dropi.hn/login';
    const ordersUrl = loginUrl.replace('/login', '/orders-history') + '?limit=100';

    let browser;
    try {
        console.log('[Playwright] Iniciando sincronización masiva de guías recientes...');
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const context = await browser.newContext(
            fs.existsSync(SESSION_FILE) ? { storageState: SESSION_FILE } : {}
        );
        const page = await context.newPage();
        
        await page.goto(ordersUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
            console.log('[Playwright] Sesión expirada, reautenticando...');
            await page.fill('input[type="email"], input[name="email"]', process.env.SOYDROP_EMAIL);
            await page.fill('input[type="password"], input[name="password"]', process.env.SOYDROP_PASSWORD);
            await page.click('button[type="submit"]');
            await page.waitForURL('**/orders-history*', { timeout: 30000 });
            await context.storageState({ path: SESSION_FILE });
            await page.goto(ordersUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        }

        console.log('[Playwright] Extrayendo tabla de órdenes...');
        await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
        
        // Scraping the whole table
        const orders = await page.$$eval('table tbody tr', rows => {
            return rows.map(row => {
                const cells = Array.from(row.querySelectorAll('td')).map(td => td.innerText.trim());
                if (cells.length < 5) return null;
                
                const thead = document.querySelectorAll('table thead th');
                const headers = Array.from(thead).map(th => th.innerText.toLowerCase());
                
                let guideIndex = headers.findIndex(h => h.includes('guía') || h.includes('guia'));
                let statusIndex = headers.findIndex(h => h.includes('estado'));
                
                let guide = null;
                if (guideIndex >= 0 && guideIndex < cells.length) guide = cells[guideIndex];
                else guide = cells.find(t => t.length > 6 && /^[A-Z0-9_-]+$/.test(t));
                
                let status = null;
                if (statusIndex >= 0 && statusIndex < cells.length) status = cells[statusIndex];
                
                let soyDropOrder = cells[0] ? cells[0].split('\\n')[0] : null;
                
                return {
                    soyDropOrder,
                    guide: guide || 'No detectada',
                    status: status || 'Desconocido',
                    rawText: cells.join(' ')
                };
            }).filter(Boolean);
        });

        await browser.close();
        
        // Return scraped orders
        return res.json({ success: true, orders });
    } catch (error) {
        console.error('[Playwright Sync Error]:', error);
        if (browser) await browser.close();
        return res.status(500).json({ success: false, error: error.message });
    }
});
`;

if (!code.includes('/api/soydrop/sync-recent-orders')) {
    code = code.replace('app.listen(PORT', syncEndpoint + '\n\napp.listen(PORT');
    fs.writeFileSync('playwright-service/index.js', code);
    console.log('Added endpoint.');
} else {
    console.log('Already added.');
}
