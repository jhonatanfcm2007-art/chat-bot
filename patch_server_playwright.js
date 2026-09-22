import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const targetImport = "import OpenAI from 'openai';";
if (content.includes(targetImport)) {
    content = content.replace(targetImport, targetImport + "\nimport { fetchIncidentHistory } from './playwrightService.js';");
} else {
    // Just put it at the top
    content = "import { fetchIncidentHistory } from './playwrightService.js';\n" + content;
}

const endpoint = `
app.post('/api/incidents/:id/fetch-history', async (req, res) => {
    try {
        const { id } = req.params;
        const incident = incidents.find(i => i.id === id);
        if (!incident) return res.status(404).json({ error: 'Incident not found' });

        // Esto usar Playwright para conectarse a Soy Drop y extraer el historial
        const history = await fetchIncidentHistory(incident.orderNumber, incident.trackingNumber);
        
        res.json({ success: true, history });
    } catch (e) {
        console.error("Error fetching history:", e);
        res.status(500).json({ error: e.message || 'Error al conectar con Soy Drop' });
    }
});
`;

const insertTarget = "app.put('/api/incidents/:id/draft', (req, res) => {";
if (content.includes(insertTarget)) {
    content = content.replace(insertTarget, endpoint + "\n" + insertTarget);
    fs.writeFileSync('server/index.js', content);
    console.log("Patched server/index.js with fetch-history endpoint");
} else {
    console.log("Target not found!");
}
