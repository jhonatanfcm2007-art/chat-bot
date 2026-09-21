import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const targetImport = `app.post('/api/incidents/import', async (req, res) => {
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

            // Link to chatId using phone or sales
            let chatId = null;
            let cleanPhone = (data.phone || '').replace(/\\D/g, '');
            if (cleanPhone.length > 5) {
                // Try to find a chat with this phone
                const possibleChats = Object.keys(chats).filter(c => c.replace(/\\D/g, '').includes(cleanPhone) || cleanPhone.includes(c.replace(/\\D/g, '')));
                if (possibleChats.length === 1) chatId = possibleChats[0];
                else if (possibleChats.length > 1) chatId = 'AMBIGUOUS_MATCH'; // Require manual review
            }
            if (!chatId && data.orderNumber) {
                const sale = sales.find(s => String(s.reference).replace('#', '').trim() === String(data.orderNumber).replace('#', '').trim());
                if (sale) chatId = sale.customerId;
            }
            data.chatId = chatId;

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
});`;

const newImport = `app.post('/api/incidents/import', async (req, res) => {
    try {
        const { filename, base64 } = req.body;
        if (!base64) return res.status(400).json({ error: 'Falta archivo' });

        const xlsx = await import('xlsx');
        const cleanBase64 = base64.includes(';base64,') ? base64.split(';base64,')[1] : base64;
        const buffer = Buffer.from(cleanBase64, 'base64');

        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, defval: '' });

        if (rows.length === 0) return res.status(400).json({ error: 'Archivo vacío' });

        let newCount = 0;
        let updateCount = 0;

        for (const row of rows) {
            // Find keys safely (case insensitive, trimmed)
            const getCol = (name) => {
                const key = Object.keys(row).find(k => k.toLowerCase().includes(name.toLowerCase()));
                return key ? row[key].trim() : '';
            };

            const order = getCol('orden') || getCol('order');
            const tracking = getCol('guía') || getCol('guia') || getCol('tracking');
            if (!order && !tracking) continue;

            const shipmentStatus = getCol('estado del envío') || getCol('estado de envio');
            const incidentStatus = getCol('estado de incidencia') || getCol('incidencia');
            const category = getCol('categoría') || getCol('categoria');
            const reason = getCol('motivo');
            const dateStr = getCol('fecha') || getCol('creación');

            // Unique ID: Order + Tracking + Category + hash of Date
            const dateHash = dateStr ? dateStr.replace(/[^a-zA-Z0-9]/g, '').slice(0,8) : 'nodate';
            const incidentId = \`inc-\${order || ''}-\${tracking || ''}-\${category || ''}-\${dateHash}\`.replace(/[^a-zA-Z0-9-]/g, '');

            const existingIdx = incidents.findIndex(inc => inc.id === incidentId);
            
            // Check if marked as delivered
            const isDelivered = (shipmentStatus || '').toLowerCase().includes('entregado');
            
            const data = {
                id: incidentId,
                orderNumber: order,
                trackingNumber: tracking,
                shipmentStatus: shipmentStatus,
                incidentStatus: incidentStatus,
                category: category,
                reason: reason,
                date: dateStr,
                firstName: getCol('nombre'),
                lastName: getCol('apellido'),
                phone: getCol('teléfono') || getCol('telefono'),
                courier: getCol('courier'),
                country: getCol('país') || getCol('pais'),
                internalState: isDelivered ? 'Cerrado/Entregado' : 'Pendiente de contactar',
                createdAt: Date.now()
            };

            // Link to chatId using phone or sales
            let chatId = null;
            let cleanPhone = (data.phone || '').replace(/\\D/g, '');
            if (cleanPhone.length > 5) {
                const possibleChats = Object.keys(chats).filter(c => c.replace(/\\D/g, '').includes(cleanPhone) || cleanPhone.includes(c.replace(/\\D/g, '')));
                if (possibleChats.length === 1) chatId = possibleChats[0];
                else if (possibleChats.length > 1) chatId = 'AMBIGUOUS_MATCH';
            }
            if (!chatId && data.orderNumber) {
                const sale = sales.find(s => String(s.reference).replace('#', '').trim() === String(data.orderNumber).replace('#', '').trim());
                if (sale) chatId = sale.customerId;
            }
            data.chatId = chatId;

            if (existingIdx !== -1) {
                const existing = incidents[existingIdx];
                // Update but preserve internalState if it has progressed
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
        res.status(500).json({ error: 'Error al importar archivo' });
    }
});`;

content = content.replace(targetImport, newImport);
fs.writeFileSync('server/index.js', content);
console.log("Patched API for xlsx");
