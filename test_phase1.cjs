const crypto = require('crypto');

const API_URL = 'http://localhost:3000';
const SECRET = 'test-secret';
process.env.SOYDROP_WEBHOOK_SECRET = SECRET;

async function testWebhook() {
    console.log("--- EJECUTANDO PRUEBAS DE WEBHOOK ---");
    
    // Test 1: Missing Signature
    try {
        const res = await fetch(API_URL + '/api/soydrop/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: 'evt-123' })
        });
        console.log("1. Falta firma (esperado 401):", res.status);
    } catch(e) {}

    // Test 2: Invalid Signature
    try {
        const res = await fetch(API_URL + '/api/soydrop/webhook', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Drop-Signature': 'firma-inventada-e-invalida'
            },
            body: JSON.stringify({ id: 'evt-124' })
        });
        console.log("2. Firma Invalida (esperado 401):", res.status);
    } catch(e) {}

    // Test 3: Valid Signature
    try {
        const payload = JSON.stringify({ id: 'evt-125' });
        const hmac = crypto.createHmac('sha256', SECRET);
        const validSig = hmac.update(payload).digest('hex');
        
        const res = await fetch(API_URL + '/api/soydrop/webhook', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Drop-Signature': validSig
            },
            body: payload
        });
        console.log("3. Firma Valida (esperado 200):", res.status);

        // Test 4: Duplicate
        const res2 = await fetch(API_URL + '/api/soydrop/webhook', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Drop-Signature': validSig
            },
            body: payload
        });
        console.log("4. Evento duplicado (esperado 200 pero marcado duplicate=true):", res2.status, await res2.text());
    } catch(e) {}
}

testWebhook().catch(console.error);
