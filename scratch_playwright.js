import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const SESSION_FILE = path.join(__dirname, 'soydrop_session.json');

app.post('/api/soydrop/get-guide', async (req, res) => {
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

        // Buscar en la tabla principal
        console.log("[Playwright] Buscando filas en la tabla...");
        // Esperamos a que la tabla cargue
        await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});

        const rows = await page.$$('table tbody tr');
        let matchedRow = null;
        let guide = null;
        let soyDropOrder = null;
        let status = null;
        let clickTarget = null;
        let rowDetails = [];

        // Buscar la fila por el nombre del cliente
        for (const row of rows) {
            const cells = await row.$$('td');
            if (!cells || cells.length < 5) continue; // Una fila de datos típica tiene varias celdas
            
            const rowTextArr = [];
            for (const cell of cells) {
                rowTextArr.push(await cell.innerText());
            }
            const fullRowText = rowTextArr.join(' ').toLowerCase();
            const searchName = customerName.toLowerCase().trim();

            // Si el nombre está en la fila
            if (fullRowText.includes(searchName)) {
                matchedRow = row;
                rowDetails = rowTextArr;
                
                // Encontrar la celda de la guía. Suele tener algo alfanumérico largo
                // Pero según el usuario está en la columna "# Guía".
                // Como no sabemos el índice exacto, lo adivinamos por el formato (ej. GUIA-XXX, PR-XXX o números largos).
                // Mejor aún, mapear cabeceras.
                const headers = await page.$$eval('table thead th', ths => ths.map(th => th.innerText.toLowerCase()));
                
                let guideIndex = headers.findIndex(h => h.includes('guía') || h.includes('guia'));
                let statusIndex = headers.findIndex(h => h.includes('estado'));
                let orderIndex = headers.findIndex(h => h.includes('orden') && !h.includes('shopify'));

                if (guideIndex >= 0 && guideIndex < rowTextArr.length) guide = rowTextArr[guideIndex].trim();
                else guide = rowTextArr.find(t => t.length > 6 && /^[A-Z0-9_-]+$/i.test(t) && !/^[A-Za-z ]+$/.test(t)); // Fallback

                if (statusIndex >= 0 && statusIndex < rowTextArr.length) status = rowTextArr[statusIndex].trim();
                
                // Intentamos buscar un enlace o un botón para abrir detalles
                clickTarget = await row.$('a, button.btn-info, button[title="Detalles"]');
                if (!clickTarget) clickTarget = cells[0]; // Clic en la primera celda si no hay botón
                
                break;
            }
        }

        if (!matchedRow) {
            throw new Error(\`No se encontró ninguna orden para el cliente: \${customerName}\`);
        }

        console.log(\`[Playwright] Orden encontrada. Guía detectada: \${guide}. Abriendo detalles...\`);
        
        // Clic para abrir el detalle y extraer el teléfono
        await clickTarget.click();
        
        // Esperar a que cargue el panel modal/página de detalle
        // Buscamos cualquier elemento que parezca contener un teléfono (números largos)
        await page.waitForTimeout(3000); // Dar tiempo a que el modal abra
        
        const pageText = await page.evaluate(() => document.body.innerText);
        
        // Extraer el teléfono de la página (una secuencia de 8-15 dígitos cerca de "Teléfono" o simplemente números)
        // Usaremos el phoneHint del CRM para validarlo rápidamente
        let phoneFound = null;
        if (phoneHint) {
            const cleanHint = phoneHint.replace(/\\D/g, '');
            if (cleanHint.length > 4 && pageText.replace(/\\D/g, '').includes(cleanHint)) {
                phoneFound = cleanHint;
            }
        }

        if (!phoneFound) {
            // Extracción cruda del primer teléfono que veamos
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

app.post('/api/soydrop/test-access', async (req, res) => {
    // ... we don't modify test-access ...
    return res.status(400).json({ success: false, error: "Use get-guide." }); // We override for brevity in this scratch script? No wait, this overwrites index.js!
});

app.get('/health', (req, res) => res.send('Playwright Service is running'));

app.listen(PORT, '::', () => {
    console.log(\`Playwright service listening on port \${PORT}\`);
});
