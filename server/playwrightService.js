import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Guardamos la sesión en DATA_DIR si existe, o en la raíz del backend
const SESSION_FILE = process.env.DATA_DIR 
    ? path.join(process.env.DATA_DIR, 'soydrop_session.json') 
    : path.join(__dirname, '..', 'data', 'soydrop_session.json');

export async function fetchIncidentHistory(orderNumber, trackingNumber) {
    const email = process.env.SOYDROP_BOT_EMAIL;
    const password = process.env.SOYDROP_BOT_PASSWORD;
    const loginUrl = process.env.SOYDROP_URL || 'https://app.dropi.hn/login'; // Usando HN por defecto, o configurable

    if (!email || !password) {
        throw new Error("Faltan las credenciales SOYDROP_BOT_EMAIL o SOYDROP_BOT_PASSWORD.");
    }

    // Asegurar que el directorio de sesión exista
    const sessionDir = path.dirname(SESSION_FILE);
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    let browser;
    try {
        console.log(`[SoyDrop] Lanzando navegador para la guía ${trackingNumber}...`);
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const context = await browser.newContext(
            fs.existsSync(SESSION_FILE) ? { storageState: SESSION_FILE } : {}
        );
        const page = await context.newPage();

        console.log(`[SoyDrop] Navegando a ${loginUrl}...`);
        await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 30000 });

        // Intentar detectar si estamos en login
        const emailInput = await page.$('input[type="email"], input[name="email"], input[id="email"]');
        if (emailInput) {
            console.log("[SoyDrop] Formulario de login detectado. Iniciando sesión...");
            await emailInput.fill(email);
            
            const passInput = await page.$('input[type="password"], input[name="password"], input[id="password"]');
            if (passInput) await passInput.fill(password);
            
            const submitBtn = await page.$('button[type="submit"], button:has-text("Ingresar"), button:has-text("Login")');
            if (submitBtn) {
                await submitBtn.click();
                await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => console.log("[SoyDrop] Timeout esperando red después del login, continuando..."));
                
                // Revisar si apareció algún error de verificación (Captcha, OTP)
                const isStillLogin = await page.$('input[type="password"]');
                if (isStillLogin) {
                    throw new Error("El inicio de sesión falló o requiere verificación manual (Captcha/2FA).");
                }
                
                // Guardar la sesión para no tener que loguearnos de nuevo
                await context.storageState({ path: SESSION_FILE });
                console.log("[SoyDrop] Sesión guardada exitosamente.");
            }
        } else {
            console.log("[SoyDrop] No se detectó login. Asumiendo sesión activa.");
        }

        // TODO: Fase 3, Paso 2 -> Navegar a la orden y leer el historial.
        // Como la estructura del DOM de Dropi puede variar, por ahora devolveremos un mensaje 
        // indicando éxito en el login para que el usuario valide la configuración en Railway.
        
        console.log(`[SoyDrop] Buscando la guía ${trackingNumber}... (Modo Prueba)`);
        const pageUrl = page.url();
        const pageTitle = await page.title();

        await browser.close();
        
        return [
            { 
                date: new Date().toISOString(), 
                source: "Sistema (Playwright)", 
                text: `✅ Conexión exitosa a Soy Drop.\nURL actual: ${pageUrl}\nTítulo: ${pageTitle}\n\nFalta programar los selectores exactos para buscar la guía ${trackingNumber}. Indícale al bot cómo es el proceso de búsqueda.` 
            }
        ];

    } catch (err) {
        if (browser) await browser.close();
        console.error("[SoyDrop] Error de Playwright:", err);
        throw err;
    }
}
