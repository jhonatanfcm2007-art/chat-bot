const crypto = require('crypto');

const API_URL = 'http://localhost:3000';
const SECRET = 'test-secret';
process.env.SOYDROP_WEBHOOK_SECRET = SECRET;

async function testWebhook() {
    console.log("--- TEST WEBHOOK ---");
    
    const payload = JSON.stringify({ id: 'evt-123', type: 'test' });
    
    let res = await fetch(API_URL + '/api/soydrop/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
    });
    console.log("Missing signature response:", res.status, await res.text());

    res = await fetch(API_URL + '/api/soydrop/webhook', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-dropi-signature': 'invalid-hash'
        },
        body: payload
    });
    console.log("Invalid signature response:", res.status, await res.text());

    const hmac = crypto.createHmac('sha256', SECRET);
    const validSig = hmac.update(payload).digest('hex');
    
    res = await fetch(API_URL + '/api/soydrop/webhook', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-dropi-signature': validSig
        },
        body: payload
    });
    console.log("Valid signature response:", res.status, await res.json());

    res = await fetch(API_URL + '/api/soydrop/webhook', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'x-dropi-signature': validSig
        },
        body: payload
    });
    console.log("Duplicate event response:", res.status, await res.json());
}

testWebhook().catch(console.error);
