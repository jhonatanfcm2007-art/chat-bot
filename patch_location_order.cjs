const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const regex = /console\.log\(\`📦 \[AUTO-APROBADO\] Pedido de \$\{chat\.customerName\}: \$\{productList\}\. Creando en Shopify\.\.\.\`\);[\s\S]*?try \{[\s\S]*?const shopifyRes = await createShopifyOrder\(chat, productList\);/;

const replacement = `const isLocationAddress = chat.address && (chat.address.includes('google.com/maps') || chat.address.includes('[UBICACIÓN]'));

        if (isLocationAddress) {
            console.log(\`📍 [UBICACIÓN] Pedido de \${chat.customerName}: \${productList}. Retenido en preparar_pedido por tener mapa.\`);
            // Enviar notificación a WhatsApp de que hay un pedido con ubicación
            if (settings && settings[chat.waLine || '1'] && settings[chat.waLine || '1'].notificationPhone) {
                const notifPhone = settings[chat.waLine || '1'].notificationPhone;
                const locNotif = \`📍 *NUEVO PEDIDO CON UBICACIÓN (REVISIÓN MANUAL REQUERIDA)*\\n\\n👤 *Nombre:* \${orderName}\\n📱 *Teléfono:* \${orderPhone}\\n📍 *Ubicación:* \${chat.address}\\n🏙️ *Municipio:* \${orderCity}\\n🗺️ *Depto:* \${orderDep}\\n🛒 *Producto:* \${productList}\\n\\n⚠️ *El pedido NO fue enviado a Shopify. Por favor, revísalo en la pestaña "Preparar Pedido" del CRM.*\`;
                try {
                    await client.sendMessage(notifPhone + '@c.us', locNotif);
                } catch (e) {
                    console.error('Error enviando notif de ubicación:', e);
                }
            }
            return; // Detenemos aquí, NO se va a Shopify
        }

        console.log(\`📦 [AUTO-APROBADO] Pedido de \${chat.customerName}: \${productList}. Creando en Shopify...\`);
        
        try {
            const shopifyRes = await createShopifyOrder(chat, productList);`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('server/index.js', code);
    console.log("Patched registerOrder for Location!");
} else {
    console.log("Not found registerOrder regex!");
}
