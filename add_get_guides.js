import fs from 'fs';
let content = fs.readFileSync('playwright-service/index.js', 'utf8');

const getGuidesEndpoint = `
app.post('/api/soydrop/get-guides', async (req, res) => {
    let browser;
    try {
        console.log(\`[Playwright] Lanzando Chromium para obtener guías...\`);
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const context = await browser.newContext(
            fs.existsSync(SESSION_FILE) ? { storageState: SESSION_FILE } : {}
        );
        const page = await context.newPage();

        const loginUrl = process.env.SOYDROP_LOGIN_URL || 'https://app.dropi.hn/login';
        
        // Asumimos que los pedidos están en /orders o /mis-pedidos
        const ordersUrl = loginUrl.replace('/login', '/orders');
        console.log(\`[Playwright] Navegando a \${ordersUrl}...\`);
        
        await page.goto(ordersUrl, { waitUntil: 'networkidle', timeout: 30000 });

        // Si nos redirige a login, fallamos (la sesión expiró)
        if (page.url().includes('login')) {
            throw new Error("La sesión expiró o no se pudo autenticar. Por favor, prueba el acceso de nuevo.");
        }

        console.log("[Playwright] Extrayendo información de la tabla de pedidos...");
        // Intentaremos extraer toda la tabla. Buscaremos filas tr.
        const orders = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('tr'));
            return rows.map(row => {
                const cells = Array.from(row.querySelectorAll('td, th'));
                return cells.map(cell => cell.innerText.trim());
            });
        });

        await browser.close();

        return res.json({ 
            success: true, 
            orders: orders
        });

    } catch (err) {
        if (browser) await browser.close();
        console.error("[Playwright] Error al obtener guías:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
});
`;

if (!content.includes('/api/soydrop/get-guides')) {
    content = content.replace("app.get('/health',", getGuidesEndpoint + "\napp.get('/health',");
    fs.writeFileSync('playwright-service/index.js', content);
    console.log("Added /api/soydrop/get-guides endpoint.");
} else {
    console.log("Endpoint already exists.");
}
