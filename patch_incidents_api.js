import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const target = `app.get('/api/anomalies', (req, res) => res.json(anomalies));`;

const replacement = `app.get('/api/incidents', (req, res) => res.json(incidents));
app.post('/api/incidents', (req, res) => { incidents = req.body; saveIncidents(incidents); io.emit('incidents_updated', incidents); res.json({success:true}); });

app.post('/api/incidents/import', async (req, res) => {
    try {
        const { csvText } = req.body;
        if (!csvText) return res.status(400).json({ error: 'Falta texto CSV' });

        // Simple CSV parser that handles quotes
        const parseCSVRow = (row) => {
            const result = [];
            let inQuotes = false;
            let current = '';
            for (let i = 0; i < row.length; i++) {
                const char = row[i];
                if (char === '"' && row[i+1] === '"') { current += '"'; i++; } // Escaped quote
                else if (char === '"') { inQuotes = !inQuotes; }
                else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
                else { current += char; }
            }
            result.push(current);
            return result.map(s => s.trim());
        };

        const lines = csvText.split(/\\r?\\n/).filter(l => l.trim().length > 0);
        if (lines.length < 2) return res.status(400).json({ error: 'CSV vacío o sin datos' });

        const headers = parseCSVRow(lines[0]).map(h => h.toLowerCase());
        
        let newCount = 0;
        let updateCount = 0;

        for (let i = 1; i < lines.length; i++) {
            const row = parseCSVRow(lines[i]);
            const getCol = (name) => {
                const idx = headers.findIndex(h => h.includes(name.toLowerCase()));
                return idx !== -1 ? row[idx] || '' : '';
            };

            const order = getCol('orden') || getCol('order');
            const tracking = getCol('guía') || getCol('guia') || getCol('tracking');
            if (!order && !tracking) continue;

            // Generate an incident ID
            const incidentId = \`inc-\${order || ''}-\${tracking || ''}\`.replace(/[^a-zA-Z0-9-]/g, '');

            const existingIdx = incidents.findIndex(inc => inc.id === incidentId);
            const data = {
                id: incidentId,
                orderNumber: order,
                trackingNumber: tracking,
                shipmentStatus: getCol('estado del envío') || getCol('estado de envio'),
                incidentStatus: getCol('estado de incidencia') || getCol('incidencia'),
                category: getCol('categoría') || getCol('categoria'),
                reason: getCol('motivo'),
                date: getCol('fecha'),
                firstName: getCol('nombre'),
                lastName: getCol('apellido'),
                phone: getCol('teléfono') || getCol('telefono'),
                courier: getCol('courier'),
                country: getCol('país') || getCol('pais'),
                internalState: 'Pendiente de contactar',
                createdAt: Date.now()
            };

            if (existingIdx !== -1) {
                // Update but preserve internalState if it has progressed
                const existing = incidents[existingIdx];
                incidents[existingIdx] = { ...existing, ...data, internalState: existing.internalState, createdAt: existing.createdAt };
                updateCount++;
            } else {
                incidents.push(data);
                newCount++;
            }
        }
        
        saveIncidents(incidents);
        io.emit('incidents_updated', incidents);
        res.json({ success: true, newCount, updateCount });
    } catch (e) {
        console.error('Error importando incidencias:', e);
        res.status(500).json({ error: 'Error al importar CSV' });
    }
});

app.get('/api/anomalies', (req, res) => res.json(anomalies));`;

content = content.replace(target, replacement);
fs.writeFileSync('server/index.js', content);
console.log("Incidents import endpoint added");
