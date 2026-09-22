import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// Remove the import if it exists
content = content.replace("import { fetchIncidentHistory } from './playwrightService.js';\n", "");

const oldEndpoint = /app\.post\('\/api\/incidents\/:id\/fetch-history', async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: e\.message \|\| 'Error al conectar con Soy Drop' \}\);\s*\}\s*\}\);/m;

const newEndpoint = `app.post('/api/incidents/:id/test-access', async (req, res) => {
    try {
        const { loginUrl, dashboardSelector } = req.body;
        
        // Esta es la URL del nuevo servicio interno de Railway (p. ej. http://soydrop-playwright.railway.internal:3001)
        // El usuario deberá configurarla como variable en el backend principal.
        const serviceUrl = process.env.PLAYWRIGHT_SERVICE_URL;

        if (!serviceUrl) {
            return res.status(500).json({ error: "Falta configurar la variable PLAYWRIGHT_SERVICE_URL en este backend principal." });
        }

        const fetchRes = await fetch(\`\${serviceUrl}/api/soydrop/test-access\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginUrl, dashboardSelector })
        });

        const data = await fetchRes.json();
        res.json(data);
    } catch (e) {
        console.error("Error connecting to Playwright Service:", e);
        res.status(500).json({ error: 'Fallo la conexión con el microservicio de Playwright: ' + e.message });
    }
});`;

if (content.match(oldEndpoint)) {
    content = content.replace(oldEndpoint, newEndpoint);
    fs.writeFileSync('server/index.js', content);
    console.log("Patched server/index.js to call external Playwright service");
} else {
    console.log("Endpoint fetch-history not found!");
}
