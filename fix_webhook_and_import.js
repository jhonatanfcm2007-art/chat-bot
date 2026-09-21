import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// 1. Webhook Secret Enforcement and DB Deduplication
const webhookAnchor = `app.post('/api/soydrop/webhook', express.json(), async (req, res) => {`;
const webhookLogic = `app.post('/api/soydrop/webhook', express.json(), async (req, res) => {
    try {
        const secret = process.env.SOYDROP_WEBHOOK_SECRET;
        if (!secret) {
            console.error('?O [SOYDROP WEBHOOK] RECHAZADO: SOYDROP_WEBHOOK_SECRET no est configurado en produccion.');
            return res.status(401).json({ error: 'Webhook secret not configured' });
        }

        const signature = req.headers['x-dropi-signature'] || req.headers['x-soydrop-signature'];
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
        const eventId = payload.id || req.headers['x-soydrop-event-id'];
        
        if (eventId && pool) {
            try {
                // Persistent deduplication in PostgreSQL
                const result = await pool.query(
                    'INSERT INTO webhook_events (id) VALUES ($1) ON CONFLICT (id) DO NOTHING',
                    [eventId]
                );
                if (result.rowCount === 0) {
                    console.log('?O [SOYDROP WEBHOOK] IGNORADO: Evento duplicado persistente', eventId);
                    return res.status(200).json({ received: true, duplicate: true });
                }
            } catch (err) {
                console.error('Error DB deduplication:', err);
            }
        }

        // Responder rpido
        res.status(200).json({ received: true });`;

// Replace the old webhook logic
content = content.replace(/app\.post\('\/api\/soydrop\/webhook', express\.json\(\), async \(req, res\) => \{[\s\S]*?\/\/ Responder r.*?pido[^}]*\}/, webhookLogic);


// 2. Fix Excel Import 'isDelivered' and Status
// Replace the previous internalState logic inside the import loop
const internalStateTarget = `const isDelivered = (shipmentStatus || '').toLowerCase().includes('entregado');
            
            const data = {`;
const internalStateNew = `const isDelivered = (shipmentStatus || '').toLowerCase().includes('entregado');
            
            const data = {`;

// Actually I just need to make sure internalState is correctly set to 'No contactar: envío entregado' and mark review
const existingDataBlock = `internalState: isDelivered ? 'Cerrado/Entregado' : 'Pendiente de contactar',`;
const newExistingDataBlock = `internalState: isDelivered ? 'No contactar: envío entregado' : 'Pendiente de contactar',
                needsReview: false,`;

content = content.replace(existingDataBlock, newExistingDataBlock);

// Collision detection enhancement
const collisionBlock = `if (existingIdx !== -1) {
                const existing = incidents[existingIdx];
                // Update but preserve internalState if it has progressed
                incidents[existingIdx] = { ...existing, ...data, internalState: existing.internalState, createdAt: existing.createdAt };
                updateCount++;
            }`;

const newCollisionBlock = `if (existingIdx !== -1) {
                const existing = incidents[existingIdx];
                // If it already exists, verify if it's identical or needs review
                const dataDiffers = existing.reason !== data.reason || existing.incidentStatus !== data.incidentStatus;
                incidents[existingIdx] = { 
                    ...existing, 
                    ...data, 
                    internalState: existing.internalState, 
                    createdAt: existing.createdAt,
                    needsReview: dataDiffers ? true : existing.needsReview
                };
                updateCount++;
            }`;

content = content.replace(collisionBlock, newCollisionBlock);

fs.writeFileSync('server/index.js', content);
console.log("Index patched with strict webhook and review flags");
