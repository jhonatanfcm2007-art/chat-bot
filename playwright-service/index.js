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
            
            const submitBtn = await page.$('button[type="submit"], button:has-text("Ingresar"), button:has-text("Login")');
            if (submitBtn) {
                await submitBtn.click();
                await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
            }
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
            throw new Error("El inicio de sesión falló. El formulario de acceso aún está visible. ¿Credenciales incorrectas?");
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

app.get('/health', (req, res) => res.send('Playwright Service is running'));

app.listen(PORT, () => {
    console.log(`Playwright service listening on port \${PORT}`);
});
