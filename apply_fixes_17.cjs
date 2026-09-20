const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

const regex = /console\.error\('❌ OpenAI API Error:', e\.message\);\s*\/\/ NUNCA apagar el bot por un error temporal de la API\./;

const replacement = `console.error('❌ OpenAI API Error:', e.message);
        
        // Alerta de Créditos de OpenAI
        if (e.message && (e.message.includes('429') || e.message.toLowerCase().includes('quota') || e.message.toLowerCase().includes('insufficient'))) {
            if (process.env.ADMIN_PHONE && !global.quotaAlertSent) {
                global.quotaAlertSent = true;
                smartSendMessage(process.env.ADMIN_PHONE, "🚨 *URGENTE (Alerta del Sistema):* El bot se ha quedado sin créditos en la cuenta de OpenAI (Saldo agotado o límite alcanzado). Los clientes están recibiendo un mensaje de disculpa. Por favor, recarga saldo en platform.openai.com lo antes posible.");
                // Restablecer la alerta en 1 hora para no hacer spam
                setTimeout(() => { global.quotaAlertSent = false; }, 3600000);
            }
        }

        // NUNCA apagar el bot por un error temporal de la API.`;

if (c.includes("console.error('❌ OpenAI API Error:', e.message);")) {
    c = c.replace(regex, replacement);
    fs.writeFileSync('server/index.js', c);
    console.log("Inyección exitosa de la alerta de créditos.");
} else {
    console.log("No se encontró el console.error.");
}
