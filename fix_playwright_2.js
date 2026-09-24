import fs from 'fs';

let content = fs.readFileSync('playwright-service/index.js', 'utf8');

// Remove get-guides
let startIdx = content.indexOf("app.post('/api/soydrop/get-guides'");
if (startIdx !== -1) {
    let nextAppPost = content.indexOf("app.get('/health'", startIdx);
    if (nextAppPost !== -1) {
        content = content.substring(0, startIdx) + content.substring(nextAppPost);
    }
}

const getGuideCode = `app.post('/api/soydrop/get-guide', async (req, res) => {
    const { customerName, phoneHint } = req.body;
    
    if (!customerName) {
        return res.status(400).json({ success: false, error: "Se requiere customerName para buscar la guía." });
    }

    const loginUrl = process.env.SOYDROP_LOGIN_URL || 'https://app.dropi.hn/login';
    // Mover de /login a /orders-history
    const ordersUrl = loginUrl.replace('/login', '/orders-history');

    let browser;
    try {
        console.log(\`[Playwright] Buscando guía para: \${customerName}\`);
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const context = await browser.newContext(
            fs.existsSync(SESSION_FILE) ? { storageState: SESSION_FILE } : {}
        );
        const page = await context.newPage();
        
        console.log(\`[Playwright] Navegando a \${ordersUrl}...\`);
        await page.goto(ordersUrl, { waitUntil: 'networkidle', timeout: 30000 });

        if (page.url().includes('login')) {
            throw new Error("La sesión expiró. Vuelve a probar acceso primero.");
        }

        console.log("[Playwright] Buscando filas en la tabla principal...");
        await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

        const rows = await page.$$('table tbody tr');
        let matchedRow = null;
        let guide = null;
        let soyDropOrder = null;
        let status = null;
        let clickTarget = null;
        let rowDetails = [];

        for (const row of rows) {
            const cells = await row.$$('td');
            if (!cells || cells.length < 5) continue;
            
            const rowTextArr = [];
            for (const cell of cells) {
                rowTextArr.push(await cell.innerText());
            }
            const fullRowText = rowTextArr.join(' ').toLowerCase();
            const searchName = customerName.toLowerCase().trim();

            if (fullRowText.includes(searchName)) {
                matchedRow = row;
                rowDetails = rowTextArr;
                
                const headers = await page.$$eval('table thead th', ths => ths.map(th => th.innerText.toLowerCase()));
                
                let guideIndex = headers.findIndex(h => h.includes('guía') || h.includes('guia'));
                let statusIndex = headers.findIndex(h => h.includes('estado'));
                
                if (guideIndex >= 0 && guideIndex < rowTextArr.length) guide = rowTextArr[guideIndex].trim();
                else guide = rowTextArr.find(t => t.length > 6 && /^[A-Z0-9_-]+$/.test(t));

                if (statusIndex >= 0 && statusIndex < rowTextArr.length) status = rowTextArr[statusIndex].trim();
                
                clickTarget = await row.$('a, button.btn-info, button[title="Detalles"], button i.fa-eye');
                if (!clickTarget) {
                    const firstBtn = await row.$('button');
                    if (firstBtn) clickTarget = firstBtn;
                    else clickTarget = cells[0];
                }
                
                break;
            }
        }

        if (!matchedRow) {
            throw new Error(\`No se encontró ninguna orden para el cliente: \${customerName}\`);
        }

        console.log(\`[Playwright] Orden encontrada. Guía detectada: \${guide}. Abriendo detalles...\`);
        
        await clickTarget.click();
        await page.waitForTimeout(3000); // Esperar modal o redirección
        
        const pageText = await page.evaluate(() => document.body.innerText);
        
        let phoneFound = null;
        if (phoneHint) {
            const cleanHint = phoneHint.replace(/\\D/g, '');
            if (cleanHint.length > 4 && pageText.replace(/\\D/g, '').includes(cleanHint)) {
                phoneFound = cleanHint;
            }
        }

        if (!phoneFound) {
            const phoneMatch = pageText.match(/Tel[é|e]fono[^0-9]*([\\d\\s\\-+()]{8,15})/i);
            if (phoneMatch) phoneFound = phoneMatch[1].replace(/\\D/g, '');
        }

        await browser.close();

        return res.json({ 
            success: true, 
            guide: guide || 'No detectada',
            soyDropOrder: soyDropOrder || 'No detectada',
            status: status || 'No detectado',
            phone: phoneFound || 'No detectado',
            rowScraped: rowDetails
        });

    } catch (err) {
        if (browser) await browser.close();
        console.error("[Playwright] Error al obtener la guía:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
});
`;

if (!content.includes('/api/soydrop/get-guide')) {
    content = content.replace("app.get('/health',", getGuideCode + "\n\napp.get('/health',");
    fs.writeFileSync('playwright-service/index.js', content);
    console.log("Added /api/soydrop/get-guide to playwright-service");
}
