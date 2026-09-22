import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const oldEndpoint = /app\.post\('\/api\/incidents\/:id\/test-access', async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: 'Fallo la conexión con el microservicio de Playwright: ' \+ e\.message \}\);\s*\}\s*\}\);/m;

const newEndpoint = `app.post('/api/incidents/:id/test-access', async (req, res) => {
    try {
        let serviceUrl = process.env.PLAYWRIGHT_SERVICE_URL;
        if (!serviceUrl) {
            return res.status(500).json({ error: "Falta configurar PLAYWRIGHT_SERVICE_URL en este backend principal." });
        }
        
        // Evitar el doble HTTP y trailing slashes
        serviceUrl = serviceUrl.trim().replace(/\\/$/, '');
        if (!/^https?:\\/\\//i.test(serviceUrl)) {
            serviceUrl = 'http://' + serviceUrl;
        }

        const fetchRes = await fetch(\`\${serviceUrl}/api/soydrop/test-access\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}) // No enviamos URL arbitraria, el microservicio usa su propia config
        });

        const data = await fetchRes.json();
        res.json(data);
    } catch (e) {
        console.error("Error connecting to Playwright Service:", e);
        res.status(500).json({ error: 'Fallo la conexión de red con el microservicio: ' + e.message });
    }
});`;

content = content.replace(oldEndpoint, newEndpoint);
fs.writeFileSync('server/index.js', content);
console.log("Patched server backend proxy");
