import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// 1. Fix 'isDelivered' bug in import
const bugTarget = `const isDelivered = (shipmentStatus || '').toLowerCase().includes('entregado');`;
const bugFix = `const cleanShipmentStatus = (shipmentStatus || '').toLowerCase().trim();
            const isDelivered = cleanShipmentStatus === 'entregado';`;
content = content.replace(bugTarget, bugFix);

// 2. Fix X-Drop-Signature and Webhook Transaction
const webhookTarget = /app\.post\('\/api\/soydrop\/webhook', express\.json\(\), async \(req, res\) => \{[\s\S]*?res\.status\(200\)\.json\(\{ received: true \}\);/;

const webhookFix = `app.post('/api/soydrop/webhook', express.json(), async (req, res) => {
    try {
        const secret = process.env.SOYDROP_WEBHOOK_SECRET;
        if (!secret) {
            console.error('?O [SOYDROP WEBHOOK] RECHAZADO: SOYDROP_WEBHOOK_SECRET no est configurado.');
            return res.status(401).json({ error: 'Webhook secret not configured' });
        }

        const signature = req.headers['x-drop-signature'] || req.headers['x-soydrop-signature'];
        if (!signature || !req.rawBody) {
            return res.status(401).json({ error: 'Missing signature or body' });
        }

        const crypto = await import('crypto');
        const hmac = crypto.createHmac('sha256', secret);
        const digest = hmac.update(req.rawBody).digest('hex');
        
        if (digest !== signature) {
            console.error('?O [SOYDROP WEBHOOK] RECHAZADO: Firma HMAC invlida.');
            return res.status(401).json({ error: 'Invalid signature' });
        }
        
        const payload = req.body;
        const eventId = payload.id || req.headers['x-soydrop-event-id'] || payload.orderNumber; // Fallback if no event id
        
        let client;
        if (eventId && pool) {
            client = await pool.connect();
            try {
                await client.query('BEGIN');
                
                const result = await client.query(
                    'INSERT INTO webhook_events (id) VALUES ($1) ON CONFLICT (id) DO NOTHING',
                    [eventId]
                );
                
                if (result.rowCount === 0) {
                    await client.query('ROLLBACK');
                    client.release();
                    console.log('?O [SOYDROP WEBHOOK] IGNORADO: Evento duplicado persistente', eventId);
                    return res.status(200).json({ received: true, duplicate: true });
                }
            } catch (err) {
                if (client) { await client.query('ROLLBACK'); client.release(); }
                console.error('Error DB deduplication:', err);
                return res.status(500).json({ error: 'DB Error' });
            }
        }

        // --- Logica de procesamiento aqui (Fase 2 lo expandira) ---
        // Aca se haran los cambios. Como todo salio bien:
        
        if (client) {
            await client.query('COMMIT');
            client.release();
        }

        // Responder rpido
        res.status(200).json({ received: true });`;

content = content.replace(webhookTarget, webhookFix);

fs.writeFileSync('server/index.js', content);
console.log("Patched Webhook and Delivery rule");
