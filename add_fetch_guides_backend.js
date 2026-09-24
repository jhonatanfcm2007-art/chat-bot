import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const fetchGuidesEndpoint = `
app.post('/api/fetch-guides', async (req, res) => {
    try {
        let serviceUrl = process.env.PLAYWRIGHT_SERVICE_URL || 'http://localhost:3001';
        serviceUrl = serviceUrl.trim().replace(/\\/$/, '');
        if (!/^https?:\\/\\//i.test(serviceUrl)) {
            serviceUrl = 'http://' + serviceUrl;
        }

        const fetchRes = await fetch(\`\${serviceUrl}/api/soydrop/get-guides\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await fetchRes.json();
        if (!data.success) {
            return res.status(500).json(data);
        }

        let matchedCount = 0;

        // data.orders es un array de filas [ [col1, col2, col3], [col1, col2, col3] ]
        const orders = data.orders || [];
        
        for (const row of orders) {
            if (!Array.isArray(row)) continue;
            
            // Buscar un teléfono en la fila
            const phoneCell = row.find(cell => /\\d{8,}/.test(String(cell).replace(/\\D/g, '')));
            if (!phoneCell) continue;
            
            const rawPhone = phoneCell.replace(/\\D/g, '');
            
            // Buscar una guía en la fila. Suele ser alfanumérica, larga, o en una celda que dice 'Guía'
            // O podemos asumir que es la celda más larga que no es un nombre.
            // Por simplicidad, tomaremos cualquier cadena que parezca una guía (ej. alfanumérico largo sin espacios)
            const guideCell = row.find(cell => {
                const str = String(cell).trim();
                return str.length > 6 && str.length < 30 && /^[A-Z0-9_-]+$/i.test(str) && !/^\\d+$/.test(str);
            });

            if (rawPhone && guideCell) {
                // Buscar si tenemos este chat
                for (const chatId in chats) {
                    const c = chats[chatId];
                    if (!c.orderPhone) continue;
                    
                    const cPhone = c.orderPhone.replace(/\\D/g, '');
                    // Si el teléfono de la tabla incluye o es igual al del chat
                    if (rawPhone.includes(cPhone) || cPhone.includes(rawPhone)) {
                        c.trackingGuide = guideCell.trim();
                        matchedCount++;
                        io.emit('chat_meta_updated', { id: chatId, chat: c });
                    }
                }
            }
        }
        
        saveChats(chats);
        res.json({ success: true, matchedCount, sample: orders.slice(0, 3) });

    } catch (e) {
        console.error("Error al obtener guías:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});
`;

if (!content.includes('/api/fetch-guides')) {
    content = content.replace("app.post('/api/incidents/:id/test-access'", fetchGuidesEndpoint + "\n\napp.post('/api/incidents/:id/test-access'");
    fs.writeFileSync('server/index.js', content);
    console.log("Added /api/fetch-guides endpoint");
}
