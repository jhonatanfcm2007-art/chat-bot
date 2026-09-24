import fs from 'fs';
let content = fs.readFileSync('playwright-service/index.js', 'utf8');

// Also, maybe the Enter key didn't submit the form, so I'll try clicking ANY button that has 'Ingresar', 'Entrar', 'Login', 'Acceder'
// OR just finding the form and calling submit().
content = content.replace(
    /await passInput.press\('Enter'\);\s*await page.waitForLoadState\('networkidle', \{ timeout: 15000 \}\).catch\(\(\) => \{\}\);/s,
    `await passInput.press('Enter');
            
            // Fallback por si Enter no dispara el form: buscar botón genérico y hacer clic
            try {
                const btn = await page.$('button[type="submit"], .btn-primary, button:has-text("Ingresar"), button:has-text("Acceder"), button:has-text("Entrar")');
                if (btn) await btn.click();
            } catch (e) {}

            await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
            await page.waitForTimeout(3000); // Darle 3 segundos extra
    `
);

content = content.replace(
    'throw new Error("El inicio de sesión falló. El formulario de acceso aún está visible. ¿Credenciales incorrectas?");',
    'throw new Error("FALLO LOGIN. Texto en pantalla: " + bodyText.replace(/\\n/g, " ").substring(0, 300));'
);

fs.writeFileSync('playwright-service/index.js', content);
