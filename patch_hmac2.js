import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const webhookRegex = /app\.post\('\/api\/soydrop\/webhook', express\.json\(\), async \(req, res\) => \{[\s\S]*?const payload = req\.body;[\s\S]*?\/\/ Responder r.*?pido para que SoyDrop no bloquee el webhook[^\n]*\n\s*res\.status\(200\)\.json\(\{ received: true \}\);/;

const replacement = `app.post('/api/soydrop/webhook', express.json(), async (req, res) => {
    try {
        const secret = process.env.SOYDROP_WEBHOOK_SECRET;
        const signature = req.headers['x-dropi-signature'] || req.headers['x-soydrop-signature'];
        
        if (secret && signature && req.rawBody) {
            const crypto = await import('crypto');
            const hmac = crypto.createHmac('sha256', secret);
            const digest = hmac.update(req.rawBody).digest('hex');
            if (digest !== signature) {
                console.error('?O [SOYDROP WEBHOOK] Firma HMAC invǭlida. Bloqueando peticion.');
                return res.status(401).json({ error: 'Invalid signature' });
            }
            console.log('o. [SOYDROP WEBHOOK] Firma HMAC validada correctamente.');
        } else if (!secret) {
            console.warn('?O [SOYDROP WEBHOOK] Advertencia: SOYDROP_WEBHOOK_SECRET no configurado. Validacion de firma omitida.');
        }

        console.log('?Y"? [SOYDROP WEBHOOK] Notificacin recibida:', JSON.stringify(req.body, null, 2));
        const payload = req.body;
        
        // Deduplication using processedWebhooks cache
        if (!global.processedWebhooks) global.processedWebhooks = new Set();
        const eventId = payload.id || req.headers['x-soydrop-event-id'];
        if (eventId) {
            if (global.processedWebhooks.has(eventId)) {
                console.log('?O [SOYDROP WEBHOOK] Evento duplicado ignorado:', eventId);
                return res.status(200).json({ received: true, duplicate: true });
            }
            global.processedWebhooks.add(eventId);
            // Keep set small
            if (global.processedWebhooks.size > 1000) global.processedWebhooks.clear();
        }

        // Responder rpido para que SoyDrop no bloquee el webhook (exige respuesta 2xx en < 10s)
        res.status(200).json({ received: true });`;

if (webhookRegex.test(content)) {
    content = content.replace(webhookRegex, replacement);
    fs.writeFileSync('server/index.js', content);
    console.log("Webhook updated successfully.");
} else {
    console.log("Regex not found.");
}
