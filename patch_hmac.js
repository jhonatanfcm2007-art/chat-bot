import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// 1. Raw body verify
const jsonConfig = `app.use(express.json({ limit: '50mb' }));`;
const jsonConfigNew = `app.use(express.json({ 
    limit: '50mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));`;
content = content.replace(jsonConfig, jsonConfigNew);

// 2. Webhook HMAC
const webhookStart = `app.post('/api/soydrop/webhook', express.json(), async (req, res) => {
    try {`;
    
const webhookHmac = `app.post('/api/soydrop/webhook', express.json(), async (req, res) => {
    try {
        const secret = process.env.SOYDROP_WEBHOOK_SECRET;
        const signature = req.headers['x-dropi-signature'] || req.headers['x-soydrop-signature'];
        
        if (secret && signature && req.rawBody) {
            const crypto = await import('crypto');
            const hmac = crypto.createHmac('sha256', secret);
            const digest = hmac.update(req.rawBody).digest('hex');
            if (digest !== signature) {
                console.error('?O [SOYDROP WEBHOOK] Firma HMAC invǭlida. Bloqueando peticin.');
                return res.status(401).json({ error: 'Invalid signature' });
            }
            console.log('o. [SOYDROP WEBHOOK] Firma HMAC validada correctamente.');
        }`;

content = content.replace(webhookStart, webhookHmac);

fs.writeFileSync('server/index.js', content);
console.log("HMAC configured");
