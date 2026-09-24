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

app.post('/api/soydrop/test-access', async (req, res) => {
    const email = process.env.SOYDROP_BOT_EMAIL;
    const password = process.env.SOYDROP_BOT_PASSWORD;
    const loginUrl = process.env.SOYDROP_LOGIN_URL;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: "Faltan SOYDROP_BOT_EMAIL o SOYDROP_BOT_PASSWORD en el microservicio." });
    }

    if (!loginUrl) {
        return res.status(400).json({ success: false, error: "Falta configurar SOYDROP_LOGIN_URL en las variables del microservicio (ej. https://app.dropi.hn/login)." });
    }

    let browser;
    try {
        console.log(`[Playwright] Lanzando Chromium...`);
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const context = await browser.newContext(
            fs.existsSync(SESSION_FILE) ? { storageState: SESSION_FILE } : {}
        );
        const page = await context.newPage();

        console.log(`[Playwright] Navegando a \${loginUrl}...`);
        await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 });

        // Intentar detectar si estamos en login
        const emailInput = await page.$('input[type="email"], input[name="email"], input[id="email"]');
        if (emailInput) {
            console.log("[Playwright] Formulario de login detectado. Ingresando credenciales...");
            await emailInput.fill(email);
            
            const passInput = await page.$('input[type="password"], input[name="password"], input[id="password"]');
            if (passInput) await passInput.fill(password);
            
            await passInput.press('Enter');
            
            // Fallback por si Enter no dispara el form: buscar botón genérico y hacer clic
            try {
                const btn = await page.$('button[type="submit"], .btn-primary, button:has-text("Ingresar"), button:has-text("Acceder"), button:has-text("Entrar")');
                if (btn) await btn.click();
            } catch (e) {}

            await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
            await page.waitForTimeout(3000); // Darle 3 segundos extra
    
        }

        console.log("[Playwright] Verificando acceso exitoso...");

        // Verificación 1: El formulario de contraseña no debe estar visible
        const isStillLogin = await page.$('input[type="password"]');
        if (isStillLogin) {
            // Intenta extraer si hay un mensaje de error visible
            const bodyText = await page.evaluate(() => document.body.innerText);
            if (bodyText.includes('recaptcha') || bodyText.toLowerCase().includes('verificar')) {
                throw new Error("Se detectó un bloqueo de verificación (Captcha/2FA) en el formulario de acceso.");
            }
            throw new Error("FALLO LOGIN. Texto en pantalla: " + bodyText.replace(/\n/g, " ").substring(0, 300));
        }

        // Verificación 2: Elementos exclusivos de sesión iniciada.
        // Dado que no sabemos la estructura exacta de Dropi de antemano, buscamos elementos genéricos
        // que confirman que estamos dentro de un panel de control.
        const dashboardElements = await page.$$('nav, aside, header, .sidebar, .menu, [role="navigation"]');
        
        if (dashboardElements.length === 0) {
            // Si no vemos elementos típicos de navegación, devolveremos un fragmento del DOM para analizarlo.
            const bodyHtml = await page.evaluate(() => document.body.innerHTML.substring(0, 1000));
            throw new Error(`La URL cambió, pero no detectamos elementos típicos de un panel (nav, aside). Primeros 1000 chars del DOM:\\n\${bodyHtml}`);
        }

        const pageTitle = await page.title();
        const currentUrl = page.url();

        // Guardamos la sesión si llegamos hasta aquí con éxito
        await context.storageState({ path: SESSION_FILE });
        await browser.close();

        return res.json({ 
            success: true, 
            message: "Acceso confirmado exitosamente. Panel autenticado detectado y sesión guardada.",
            details: { title: pageTitle, url: currentUrl }
        });

    } catch (err) {
        if (browser) await browser.close();
        console.error("[Playwright] Error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
});


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
        console.log(`[Playwright] Buscando guía para: ${customerName}`);
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const context = await browser.newContext(
            fs.existsSync(SESSION_FILE) ? { storageState: SESSION_FILE } : {}
        );
        const page = await context.newPage();
        
        console.log(`[Playwright] Navegando a ${ordersUrl}...`);
        await page.goto(ordersUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

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
                
                const headers = await page.$eval('table thead th', ths => ths.map(th => th.innerText.toLowerCase()));
                
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
            throw new Error(`No se encontró ninguna orden para el cliente: ${customerName}`);
        }

        console.log(`[Playwright] Orden encontrada. Guía detectada: ${guide}. Abriendo detalles...`);
        
        await clickTarget.click();
        await page.waitForTimeout(3000); // Esperar modal o redirección
        
        const pageText = await page.evaluate(() => document.body.innerText);
        
        let phoneFound = null;
        if (phoneHint) {
            const cleanHint = phoneHint.replace(/\D/g, '');
            if (cleanHint.length > 4 && pageText.replace(/\D/g, '').includes(cleanHint)) {
                phoneFound = cleanHint;
            }
        }

        if (!phoneFound) {
            const phoneMatch = pageText.match(/Tel[é|e]fono[^0-9]*([\d\s\-+()]{8,15})/i);
            if (phoneMatch) phoneFound = phoneMatch[1].replace(/\D/g, '');
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


app.get('/health', (req, res) => res.send('Playwright Service is running'));

app.listen(PORT, '::', () => {
    console.log(`Playwright service listening on port \${PORT}`);
});
