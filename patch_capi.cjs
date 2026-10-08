const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const capiFunction = `
// --- META CONVERSIONS API ---
const crypto = require('crypto');
const axios = require('axios');

async function sendMetaCAPIEvent(chat, productList) {
    try {
        const line = chat.waLine || '1';
        const lineSettings = settings[line];
        
        if (!lineSettings || !lineSettings.metaPixelId || !lineSettings.metaCapiToken) {
            return; // No Meta settings for this line
        }

        const pixelId = lineSettings.metaPixelId.trim();
        const token = lineSettings.metaCapiToken.trim();
        
        // Hash formatting rules: sha256, lowercase, no symbols
        const hash = (str) => crypto.createHash('sha256').update(String(str).trim().toLowerCase()).digest('hex');
        
        let phone = chat.orderPhone || chat.id.split('@')[0];
        phone = phone.replace(/\\D/g, ''); // just numbers
        
        let firstName = '';
        let lastName = '';
        if (chat.orderName) {
            const parts = chat.orderName.trim().split(' ');
            firstName = parts[0];
            lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
        }

        const city = chat.city || '';
        const state = chat.province || '';
        let country = 'ni'; // Default based on area codes if needed
        if (phone.startsWith('504')) country = 'hn';
        else if (phone.startsWith('503')) country = 'sv';
        else if (phone.startsWith('502')) country = 'gt';
        else if (phone.startsWith('506')) country = 'cr';

        // Extract a basic price from products if possible (assuming 150 as fallback for ROAS)
        let value = 150; 
        const priceMatch = productList.match(/\\b(\\d{2,4})\\b/);
        if (priceMatch) {
            value = parseInt(priceMatch[1]);
        }

        const payload = {
            data: [
                {
                    event_name: 'Purchase',
                    event_time: Math.floor(Date.now() / 1000),
                    action_source: 'system_generated',
                    event_source_url: 'https://backend-production-3b17.up.railway.app/crm',
                    user_data: {
                        ph: [hash(phone)],
                        fn: firstName ? [hash(firstName)] : [],
                        ln: lastName ? [hash(lastName)] : [],
                        ct: city ? [hash(city)] : [],
                        st: state ? [hash(state)] : [],
                        country: [hash(country)]
                    },
                    custom_data: {
                        currency: 'USD',
                        value: value,
                        content_name: productList
                    }
                }
            ]
        };

        const res = await axios.post(\`https://graph.facebook.com/v19.0/\${pixelId}/events?access_token=\${token}\`, payload);
        console.log(\`✅ [META CAPI] Evento Purchase disparado para \${firstName} (\${pixelId})\`);
    } catch (err) {
        console.error('❌ [META CAPI] Error:', err.response ? err.response.data : err.message);
    }
}
`;

// Insert the function above registerOrder
if (!code.includes('sendMetaCAPIEvent')) {
    code = code.replace('async function registerOrder', capiFunction + '\nasync function registerOrder');
}

// Trigger it inside registerOrder
const triggerCode = `
                if (shopifyRes.orderName) chat.shopifyOrderName = shopifyRes.orderName;
                if (shopifyRes.orderId) chat.shopifyOrderId = shopifyRes.orderId;
                saveChats(chats);
                
                // DISPARAR META CAPI AL CONFIRMAR LA VENTA
                sendMetaCAPIEvent(chat, productList);
`;

if (!code.includes('sendMetaCAPIEvent(chat, productList)')) {
    code = code.replace(`if (shopifyRes.orderName) chat.shopifyOrderName = shopifyRes.orderName;
                if (shopifyRes.orderId) chat.shopifyOrderId = shopifyRes.orderId;
                saveChats(chats);`, triggerCode);
}

fs.writeFileSync('server/index.js', code);
console.log('Backend patched with Meta CAPI!');
