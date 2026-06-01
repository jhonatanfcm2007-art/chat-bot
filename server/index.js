import dotenv from 'dotenv';
dotenv.config(); 

import express from 'express';
import { Server } from 'socket.io';
import http from 'http';
import cors from 'cors';
import OpenAI from 'openai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Refuerzo opcional de ruta
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const openai = (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 20)
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

// Configuración de Meta desde .env
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ADMIN_PHONE = process.env.ADMIN_PHONE;

// Configuración Messenger
const MESSENGER_PAGE_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
const MESSENGER_VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN || VERIFY_TOKEN;

console.log('--- [SISTEMA] Diagnóstico de Variables ---');
console.log('OpenAI Key:', process.env.OPENAI_API_KEY ? `Detectada (${process.env.OPENAI_API_KEY.substring(0, 10)}...)` : '❌ FALTANTE');
console.log('WhatsApp Token:', WHATSAPP_TOKEN ? '✅ Detectado' : '❌ FALTANTE');
console.log('Phone ID:', PHONE_ID ? '✅ Detectado' : '❌ FALTANTE');
console.log('Admin Phone:', ADMIN_PHONE ? `✅ Detectado (${ADMIN_PHONE})` : '❌ FALTANTE');

// URL pública del backend (Railway la provee automáticamente)
const BACKEND_URL = process.env.RAILWAY_PUBLIC_DOMAIN 
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
    : (process.env.BACKEND_URL || '');
console.log('Backend URL:', BACKEND_URL || '⚠️ No configurada (usando rutas relativas)');
console.log('-----------------------------------------');

let lastReceiptFrom = null; 
const aiTimers = {};

// --- PERSISTENCIA ---
const DATA_DIR = path.join(__dirname, 'data');
const INVENTORY_FILE = path.join(DATA_DIR, 'inventory.json');
const SALES_FILE = path.join(DATA_DIR, 'sales.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const PLATFORMS_FILE = path.join(DATA_DIR, 'platforms.json');
const PROVIDERS_FILE = path.join(DATA_DIR, 'providers.json');
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'campaigns.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use('/uploads', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    next();
}, express.static(UPLOADS_DIR));

app.get('/', (req, res) => res.send('Backend Chatbot CRM running 🚀'));

function loadInventory() {
    try {
        if (fs.existsSync(INVENTORY_FILE)) return JSON.parse(fs.readFileSync(INVENTORY_FILE, 'utf-8'));
    } catch (err) { console.error('Error loading inventory:', err); }
    return [];
}
function saveInventory(data) { fs.writeFileSync(INVENTORY_FILE, JSON.stringify(data, null, 2)); }

function loadSales() {
    try {
        if (fs.existsSync(SALES_FILE)) return JSON.parse(fs.readFileSync(SALES_FILE, 'utf-8'));
    } catch (err) { console.error('Error loading sales:', err); }
    return [];
}
function saveSales(data) { fs.writeFileSync(SALES_FILE, JSON.stringify(data, null, 2)); }

function loadChats() {
    try {
        if (fs.existsSync(CHATS_FILE)) {
            const data = JSON.parse(fs.readFileSync(CHATS_FILE, 'utf-8'));
            Object.keys(data).forEach(id => {
                if (!data[id].updatedAt) data[id].updatedAt = Date.now();
            });
            return data;
        }
    } catch (err) { console.error('Error loading chats:', err); }
    return {};
}
function saveChats(data) { fs.writeFileSync(CHATS_FILE, JSON.stringify(data, null, 2)); }

function loadSettings() {
    const def = { 
        systemPrompt: "Eres el asistente virtual oficial de ventas y soporte para cuentas de streaming por WhatsApp. Eres directo, breve y muy eficiente. Usa emojis con moderación.\n\n### REGLA FUNDAMENTAL - DETECCIÓN DE INTENCIÓN:\n- **COMPRA NUEVA** → Procede con la estrategia de VENTA.\n- **SOPORTE** → Si reporta un problema técnico, usa [APAGAR_BOT_SOPORTE] para un humano.\n\n### ESTRATEGIA DE VENTA:\n1. **COTIZACIÓN**: Si preguntan precios, da los precios y pregunta si desean la cuenta. NO entregues nada aún.\n2. **ENTREGA (¡MUY IMPORTANTE!)**: Si el cliente dice 'Sí', 'Listo', 'Dale', 'Yo quiero' O acepta tu oferta de probar la cuenta primero, DEBES entregarla INMEDIATAMENTE. Para entregarla, TU RESPUESTA DEBE INCLUIR ESTAS ETIQUETAS (y nada más):\n   [ENTREGAR_AHORA]\n   [PRODUCTOS: NombrePlataforma]\n   Ejemplo perfecto: 'Perfecto, ya mismo te la activo. [ENTREGAR_AHORA] [PRODUCTOS: Netflix]'\n3. **FALSOS PAGOS**: NUNCA asumas que un cliente ha pagado solo porque dice 'listo', 'ya pagué' o 'ok'. Si confirman pago pero NO ves el mensaje '[FOTO]' o '[DOCUMENTO]' en el chat reciente, OBLIGATORIAMENTE diles: 'Por favor, envíame la foto del comprobante de transferencia para verificar el pago.' No agradezcas el pago si no hay foto.\n4. PROHIBIDO INVENTAR: NUNCA inventes correos, usuarios o contraseñas. El sistema lo hace solo usando [ENTREGAR_AHORA]. NUNCA digas 'te envié los datos' si no usaste la etiqueta.\n5. SIN STOCK: Si piden algo y ves en el inventario que no hay, usa [APAGAR_BOT_SOPORTE].\n\n### PAGOS:\n- Métodos: Nequi, Daviplata o Bancolombia.\n- Cuando el cliente envíe '[FOTO]', diles que estás verificando y no digas que ya está activado hasta que un humano lo apruebe."
    };
    try {
        if (fs.existsSync(SETTINGS_FILE)) return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    } catch (err) { console.error('Error loading settings:', err); }
    return def;
}
function saveSettings(data) { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2)); }

function loadPlatforms() {
    try {
        if (fs.existsSync(PLATFORMS_FILE)) return JSON.parse(fs.readFileSync(PLATFORMS_FILE, 'utf-8'));
    } catch (err) {}
    return ['Netflix', 'Disney+', 'Prime Video', 'HBO Max', 'Paramount', 'Vix', 'Crunchyroll'];
}
function savePlatforms(data) { fs.writeFileSync(PLATFORMS_FILE, JSON.stringify(data, null, 2)); }

function loadProviders() {
    try {
        if (fs.existsSync(PROVIDERS_FILE)) return JSON.parse(fs.readFileSync(PROVIDERS_FILE, 'utf-8'));
    } catch (err) {}
    return ['WebX', 'Proveedor Externo'];
}
function saveProviders(data) { fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(data, null, 2)); }

function loadCampaigns() {
    try {
        if (fs.existsSync(CAMPAIGNS_FILE)) return JSON.parse(fs.readFileSync(CAMPAIGNS_FILE, 'utf-8'));
    } catch (err) { console.error('Error loading campaigns:', err); }
    return [];
}
function saveCampaigns(data) { fs.writeFileSync(CAMPAIGNS_FILE, JSON.stringify(data, null, 2)); }

// --- DATA INITIALIZATION ---
let inventory = loadInventory();
let sales = loadSales();
let chats = loadChats();
let settings = loadSettings();
let platforms = loadPlatforms();
let providers = loadProviders();
let campaigns = loadCampaigns();

// MIGRACIÓN: Normalizar URLs de imágenes antiguas a rutas relativas
(function migrateMediaUrls() {
    let fixed = 0;
    for (const chatId in chats) {
        const chat = chats[chatId];
        if (!chat.messages) continue;
        for (const msg of chat.messages) {
            // Normalizar imageUrl
            if (msg.imageUrl && msg.imageUrl.startsWith('http')) {
                try {
                    const parsed = new URL(msg.imageUrl);
                    if (parsed.pathname.startsWith('/uploads/') || parsed.pathname.startsWith('/api/media/')) {
                        msg.imageUrl = parsed.pathname;
                        fixed++;
                    }
                } catch(e) {}
            }
            // Normalizar fileUrl
            if (msg.fileUrl && msg.fileUrl.startsWith('http')) {
                try {
                    const parsed = new URL(msg.fileUrl);
                    if (parsed.pathname.startsWith('/uploads/') || parsed.pathname.startsWith('/api/media/')) {
                        msg.fileUrl = parsed.pathname;
                        fixed++;
                    }
                } catch(e) {}
            }
        }
    }
    if (fixed > 0) {
        saveChats(chats);
        console.log(`🔧 [MIGRACIÓN] ${fixed} URLs de media normalizadas a rutas relativas.`);
    }
})();


// MIGRACION 2: Convertir imagenes en disco a base64 inline para persistencia
(function migrateImagesToBase64() {
    var converted = 0;
    for (var chatId in chats) {
        var chat = chats[chatId];
        if (!chat.messages) continue;
        for (var j = 0; j < chat.messages.length; j++) {
            var msg = chat.messages[j];
            if (msg.imageUrl && msg.imageUrl.startsWith('/uploads/') && !msg.imageBase64) {
                try {
                    var filePath = path.join(DATA_DIR, msg.imageUrl);
                    if (fs.existsSync(filePath)) {
                        var buffer = fs.readFileSync(filePath);
                        var ext = msg.imageUrl.split('.').pop().toLowerCase();
                        var mimeType = ext === 'webp' ? 'image/webp' : (ext === 'png' ? 'image/png' : 'image/jpeg');
                        msg.imageBase64 = 'data:' + mimeType + ';base64,' + buffer.toString('base64');
                        converted++;
                    }
                } catch(e) {}
            }
        }
    }
    if (converted > 0) {
        saveChats(chats);
        console.log('[MIGRACION 2] ' + converted + ' imagenes convertidas a base64 inline para persistencia.');
    }
})();
const getPlatformNames = () => platforms.map(p => p.toLowerCase());

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const recoveryTimers = {};
const paymentReminderTimers = {};

function scheduleRecovery(to) {
    if (recoveryTimers[to]) clearTimeout(recoveryTimers[to]);
    
    const chat = chats[to];
    if (!chat || chat.isBlocked) return;

    // No programar si ya tiene etiquetas de compra o pago en progreso
    const hasActiveTransaction = (chat.tags || []).some(t => ['pagado', 'entregado', 'pago-pendiente'].includes(t));
    if (hasActiveTransaction) return;

    recoveryTimers[to] = setTimeout(async () => {
        const c = chats[to];
        if (!c || c.isBlocked) return;
        
        // Verificar de nuevo al momento de ejecutar
        const stillEligible = !(c.tags || []).some(t => ['pagado', 'entregado', 'pago-pendiente'].includes(t));
        const lastMsg = c.messages[c.messages.length - 1];
        const isBotLast = lastMsg && (lastMsg.role === 'bot' || lastMsg.isMe);

        // Detectar si ya se enviaron credenciales o solicitud de pago (entrega manual incluida)
        const credentialsAlreadySent = c.messages.some(m => {
            const text = (m.body || m.content || '').toLowerCase();
            return text.includes('correo:') || text.includes('contraseña:') || 
                   text.includes('clave:') || text.includes('nequi') || 
                   text.includes('activar primero') || text.includes('datos de acceso') ||
                   text.includes('puedes hacer el pago') || text.includes('pago vía') ||
                   text.includes('comprobante');
        });

        if (stillEligible && isBotLast && !c.recoverySentAt && !credentialsAlreadySent) {
            const msgBody = "si estas interesado te la puedo activar primero";
            await sendMessageToCloudAPI(to, msgBody);
            const botMsg = { id: 'rec-'+Date.now(), from: to, body: msgBody, content: msgBody, isMe: true, role: 'bot', timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }), timestampRaw: Date.now() };
            c.messages.push(botMsg);
            c.recoverySentAt = Date.now();
            c.updatedAt = Date.now();
            saveChats(chats);
            io.emit('message', botMsg);
        }
        delete recoveryTimers[to];
    }, 120000);
}

// Timer de cobro automático: 20 minutos después de entregar credenciales
function schedulePaymentReminder(to) {
    if (paymentReminderTimers[to]) clearTimeout(paymentReminderTimers[to]);
    
    paymentReminderTimers[to] = setTimeout(async () => {
        const c = chats[to];
        if (!c || c.isBlocked) { delete paymentReminderTimers[to]; return; }
        
        // Solo enviar si NO ha pagado aún
        const hasPaid = (c.tags || []).includes('pagado');
        if (hasPaid) { delete paymentReminderTimers[to]; return; }
        
        // Solo enviar si la IA no está apagada (para no molestar en soporte)
        if (c.aiDisabled) { delete paymentReminderTimers[to]; return; }
        
        const reminderMsg = `¡Hola ${c.customerName}! 👋 Te recuerdo que ya tienes tu cuenta activa para que la pruebes. 😊\n\nPara validar tu garantía y mantener el acceso, realiza el pago y envíanos el comprobante:\n\n💰 *Nequi:* 3105779631\n🔑 *Llave bre-b:* 3213434397\n\n¡Quedo atento! 🙏`;
        
        await smartSendMessage(to, reminderMsg);
        const botMsg = { 
            id: 'pay-rem-'+Date.now(), from: to, body: reminderMsg, content: reminderMsg, 
            isMe: true, role: 'bot', timestampRaw: Date.now(),
            timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
        };
        c.messages.push(botMsg);
        c.paymentReminderSent = true;
        saveChats(chats);
        io.emit('message', botMsg);
        
        console.log(`💰 [COBRO AUTO] Recordatorio de pago enviado a ${c.customerName}`);
        if (ADMIN_PHONE) smartSendMessage(ADMIN_PHONE, `💰 Recordatorio de pago enviado automáticamente a *${c.customerName}*.`);
        
        delete paymentReminderTimers[to];
    }, 20 * 60 * 1000); // 20 minutos
    
    console.log(`⏰ [COBRO AUTO] Timer de cobro programado para ${chats[to]?.customerName} en 20 minutos.`);
}

// --- CENTRAL DELIVERY FUNCTION ---
async function executeDelivery(to, mode = 'deliver_first') {
    const chat = chats[to];
    if (!chat) return { success: false, error: 'Chat not found' };
    if (chat.isAutoDelivering) return { success: false, error: 'Already delivering' };

    chat.isAutoDelivering = true;
    try {
        let productsToDeliver = chat.pendingProducts?.length > 0 ? chat.pendingProducts : null;

        if (!productsToDeliver || productsToDeliver.length === 0) {
            // Solo buscamos productos en los últimos mensajes del USUARIO para evitar falsos positivos con lo que el bot ofrece
            const userText = (chat.messages || [])
                .filter(m => m.role === 'user')
                .slice(-10)
                .map(m => (m.content || m.body || '').toLowerCase())
                .join(' ');
            
            // Si el usuario mencionó específicamente un servicio que tenemos, lo marcamos
            // Búsqueda relajada para evitar fallos si el usuario no pone el '+' de 'Disney+'
            productsToDeliver = inventory
                .filter(a => {
                    const servClean = a.service.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const uTextClean = userText.replace(/[^a-z0-9]/g, '');
                    return uTextClean.includes(servClean) || userText.includes(a.service.toLowerCase());
                })
                .map(a => a.service)
                .filter((v, i, arr) => arr.indexOf(v) === i);
        }

        if (!productsToDeliver || productsToDeliver.length === 0) {
            if (ADMIN_PHONE) smartSendMessage(ADMIN_PHONE, `⚠️ No detecté productos para entregar a *${chat.customerName}*.`);
            return { success: false, error: 'No products detected' };
        }

        let totalMsg = `🚀 *¡Hola ${chat.customerName}! Aquí tienes tus cuentas activas:*\n\n`;
        let accountsFound = 0;
        const deliveredSales = [];
        const pendingToDeliverAfterPayment = [];

        for (const serviceName of productsToDeliver) {
            // Limitar a 1 si no está pagado
            if (accountsFound >= 1 && mode !== 'deliver_and_paid') {
                pendingToDeliverAfterPayment.push(serviceName);
                continue;
            }

            const accIndex = inventory.findIndex(a => {
                const s1 = a.service.toLowerCase().replace(/[^a-z0-9]/g, '');
                const s2 = serviceName.toLowerCase().replace(/[^a-z0-9]/g, '');
                return (s1.includes(s2) || s2.includes(s1)) && (parseInt(a.uses) > 0);
            });
            if (accIndex !== -1) {
                const acc = inventory[accIndex];
                const salePrice = chat.pendingTotal ? Math.round(parseInt(chat.pendingTotal) / productsToDeliver.length) : (parseFloat(acc.price) || 0);
                const now = new Date();
                const ref = `${acc.service.substring(0,4).toUpperCase()}-${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
                
                sales.push({
                    id: 'sale-' + Date.now() + '-' + Math.random(),
                    reference: ref, service: acc.service, price: salePrice, cost: acc.cost, provider: acc.provider, 
                    date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }), 
                    customer: chat.customerName, customerId: to,
                    email: acc.email, pass: acc.pass, profile: acc.profile, pin: acc.pin || '', expiration: acc.expiration || '',
                    accountId: acc.id,
                    paid: mode === 'deliver_and_paid' || mode === 'confirm_payment'
                });

                deliveredSales.push(acc.service);
                acc.uses = parseInt(acc.uses) - 1;
                if (acc.uses <= 0) acc.status = 'Sold Out';

                totalMsg += `✅ *${acc.service}*\n📧 *Correo:* ${acc.email}\n🔑 *Clave:* ${acc.pass}${acc.profile ? '\n👤 *Perfil:* ' + acc.profile : ''}${acc.pin ? '\n📌 *PIN:* ' + acc.pin : ''}\n\n`;
                accountsFound++;
            }
        }

        if (accountsFound > 0) {
            totalMsg += `⚠️ No modificar datos para mantener tu garantía.\n\n`;
            if (pendingToDeliverAfterPayment.length > 0) {
                totalMsg += `🤖 *Nota de seguridad:* Como soy un asistente virtual con Inteligencia Artificial, por seguridad el sistema me permite activarte solo una (1) cuenta primero para que pruebes.\n\nCon esto puedes verificar que somos totalmente serios. No estoy programado para estafar, así que puedes estar totalmente tranquilo. 😊\n\nLas demás cuentas (${pendingToDeliverAfterPayment.join(', ')}) se te enviarán automáticamente una vez realices el pago total.\n\n`;
            }
            await smartSendMessage(to, totalMsg);

            // Marcar que se entregaron credenciales
            chat.credentialsDelivered = true;

            // Gestión de etiquetas
            if (mode === 'deliver_and_paid') {
                chat.tags = ['pagado'];
            } else {
                chat.tags = ['pago-pendiente'];
            }
            chat.pendingProducts = [];
            chat.pendingTotal = null;
            chat.updatedAt = Date.now();

            saveSales(sales); saveInventory(inventory); saveChats(chats);
            io.emit('sales_updated', sales); io.emit('inventory_updated', inventory); io.emit('tag_updated', { from: to, tags: chat.tags });

            const botMsgData = {
                id: 'auto-' + Date.now(), from: to, customerName: 'Sistema', body: totalMsg,
                timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
                timestampRaw: Date.now(), isMe: true, role: 'bot'
            };
            chat.messages.push({ ...botMsgData, content: totalMsg });
            io.emit('message', botMsgData);

            // COBRO AUTOMÁTICO
            const paymentMsg = `¡Cuentas listas! 🚀 Ya puedes probarlas.\n\nProcede con el pago y envía el comprobante para validar tu garantía:\n\n💰 *Nequi:* 3105779631\n🔑 *Llave bre-b:* 3213434397\n\n¡Quedo atento! 😊`;
            await delay(2000);
            await smartSendMessage(to, paymentMsg);

            const cobroMsg = { ...botMsgData, id: 'cobro-' + Date.now(), body: paymentMsg, content: paymentMsg };
            chat.messages.push(cobroMsg);
            saveChats(chats);
            io.emit('message', cobroMsg);
            
            // Programar recordatorio de pago
            schedulePaymentReminder(to);
            scheduleRecovery(to);

            if (ADMIN_PHONE) {
                const notif = mode === 'auto' ? `🚀 *ENTREGA AUTO:* Envié *${deliveredSales.join(', ')}* a *${chat.customerName}* y realicé el cobro.` : `✅ *ENTREGA EXITOSA* a *${chat.customerName}*.`;
                sendMessageToCloudAPI(ADMIN_PHONE, notif);
            }
            return { success: true };
        } else {
            // SIN STOCK - Enviar UN solo mensaje y APAGAR la IA
            const noStockMsg = `Hola ${chat.customerName}, en este momento no tenemos disponibilidad para lo que necesitas. 😔 Un asesor te contactará pronto para ayudarte. ¡Gracias por tu paciencia!`;
            await smartSendMessage(to, noStockMsg);
            
            const holdBotMsg = {
                id: 'hold-' + Date.now(), from: to, body: noStockMsg, content: noStockMsg,
                isMe: true, role: 'bot', timestampRaw: Date.now(),
                timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
            };
            chat.messages.push(holdBotMsg);
            
            // APAGAR LA IA para que no repita el mensaje
            chat.aiDisabled = true;
            if (!chat.tags?.includes('soporte')) {
                chat.tags = [...(chat.tags || []), 'soporte'];
            }
            saveChats(chats);
            io.emit('message', holdBotMsg);
            io.emit('ai_state_updated', { chatId: to, disabled: true });
            io.emit('tag_updated', { from: to, tags: chat.tags });

            if (ADMIN_PHONE) smartSendMessage(ADMIN_PHONE, `❌ *SIN STOCK* para *${chat.customerName}*. La IA se ha apagado. Repón inventario.`);
            return { success: false, error: 'No stock' };
        }
    } catch (err) { console.error('Delivery logic error:', err); return { success: false, error: err.message }; }
    finally { chat.isAutoDelivering = false; }
}


// Helper global: detectar si ya se enviaron credenciales o se cobró en este chat
const credentialsSentInChat = (chatOrMessages) => {
    // Aceptar tanto el objeto chat completo como solo el array de mensajes
    let messages, chat;
    if (Array.isArray(chatOrMessages)) {
        messages = chatOrMessages;
        chat = null;
    } else if (chatOrMessages && chatOrMessages.messages) {
        messages = chatOrMessages.messages;
        chat = chatOrMessages;
    } else {
        return false;
    }

    // 1. Si el chat tiene el flag explícito (venta manual desde el panel), siempre true
    if (chat && chat.credentialsDelivered) return true;

    if (!messages || !Array.isArray(messages)) return false;
    
    return messages.some(m => {
        if (m.role !== 'bot' && !m.isMe) return false; // Solo chequear mensajes del bot/admin
        const text = (m.body || m.content || '').toLowerCase();
        
        // Formato automático del bot
        if (text.includes('📧 *correo:*') || 
            text.includes('🔑 *clave:*') || 
            text.includes('aquí tienes tus cuentas activas') ||
            text.includes('nota de seguridad: como soy un asistente virtual')) {
            return true;
        }
        
        // Credenciales manuales del admin (cualquier combinación de datos de acceso)
        if ((text.includes('correo:') || text.includes('correo :') || text.includes('email:')) && 
            (text.includes('contraseña:') || text.includes('contraseña :') || 
             text.includes('clave:') || text.includes('clave :') || 
             text.includes('pass:') || text.includes('password:'))) {
            return true;
        }
        
        // Patrones comunes de entrega manual
        if (text.includes('datos de acceso') || 
            text.includes('tus credenciales') ||
            text.includes('aquí están los datos') ||
            text.includes('aqui estan los datos') ||
            text.includes('te envío los datos') ||
            text.includes('te envio los datos') ||
            text.includes('perfil:') && (text.includes('pin:') || text.includes('clave:'))) {
            return true;
        }
        
        // Mensaje de cobro (indica que ya se entregó)
        if (text.includes('procede con el pago') || 
            text.includes('puedes hacer el pago') ||
            text.includes('envía el comprobante') ||
            text.includes('envia el comprobante')) {
            return true;
        }
        
        return false;
    });
};

// --- WEBHOOK META (WHATSAPP) ---
app.get('/webhook', (req, res) => {
    const challenge = req.query['hub.challenge'];
    if (req.query['hub.verify_token'] === VERIFY_TOKEN) res.status(200).send(challenge);
    else res.sendStatus(403);
});

// --- WEBHOOK META (MESSENGER) ---
app.get('/webhook/messenger', (req, res) => {
    const challenge = req.query['hub.challenge'];
    if (req.query['hub.verify_token'] === MESSENGER_VERIFY_TOKEN) res.status(200).send(challenge);
    else res.sendStatus(403);
});

app.post('/webhook', async (req, res) => {
    const body = req.body;
    if (body.object === 'whatsapp_business_account' && body.entry?.[0].changes?.[0].value.messages?.[0]) {
        const msg = body.entry[0].changes[0].value.messages[0];
        const from = msg.from;
        const contacts = body.entry[0].changes[0].value.contacts;
        const customerName = contacts?.[0]?.profile?.name || from;

        // Comandos Admin
        if (ADMIN_PHONE && from === ADMIN_PHONE && msg.type === 'text' && /^r$/i.test(msg.text.body.trim())) {
            let target = null; let mode = null;
            if (lastReceiptFrom && chats[lastReceiptFrom]) {
                target = chats[lastReceiptFrom];
                const alreadyDelivered = target.tags?.includes('entregado') || credentialsSentInChat(target);
                mode = alreadyDelivered ? 'confirm_payment' : 'deliver_and_paid';
            }
            if (!target) {
                const pending = Object.values(chats).filter(c => c.from !== ADMIN_PHONE && c.pendingProducts?.length > 0 && !c.tags?.includes('entregado')).sort((a,b) => b.updatedAt - a.updatedAt);
                if (pending.length > 0) { target = pending[0]; mode = 'deliver_first'; }
            }
            if (!target) {
                const tagged = Object.values(chats).filter(c => c.tags?.includes('pago-pendiente')).sort((a,b) => b.updatedAt - a.updatedAt);
                if (tagged.length > 0) { target = tagged[0]; mode = 'deliver_first'; }
            }

            if (target) {
                if (mode === 'confirm_payment') {
                    target.tags = (target.tags || []).filter(t => t !== 'entregado' && t !== 'pago-pendiente');
                    target.tags.push('pagado');
                    target.updatedAt = Date.now();
                    saveChats(chats); io.emit('tag_updated', { from: target.from, tags: target.tags });
                    const confirmMsg = '✅ *¡Pago confirmado!* Muchas gracias 🎉';
                    await smartSendMessage(target.from, confirmMsg);
                    const botMsg = { id: 'conf-'+Date.now(), from: target.from, body: confirmMsg, isMe: true, role: 'bot', timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }), timestampRaw: Date.now() };
                    target.messages.push({ ...botMsg, content: confirmMsg });
                    io.emit('message', botMsg);
                    smartSendMessage(ADMIN_PHONE, `✅ PAGO CONFIRMADO de ${target.customerName}.`);
                    // Cancelar timer de cobro si existe
                    if (paymentReminderTimers[target.from]) {
                        clearTimeout(paymentReminderTimers[target.from]);
                        delete paymentReminderTimers[target.from];
                    }
                    lastReceiptFrom = null;
                } else {
                    await executeDelivery(target.from, mode);
                    if (lastReceiptFrom === target.from) lastReceiptFrom = null;
                }
            } else {
                smartSendMessage(ADMIN_PHONE, `ℹ️ Sin pendientes.`);
            }
            res.sendStatus(200); return;
        }

        // Mensajes de Clientes
        // Manejo de Multimedia (Imágenes, Stickers, Documentos)
        let mediaUrl = null;
        let msgBody = '';
        
        switch (msg.type) {
            case 'text':
                msgBody = msg.text.body;
                break;
            case 'image':
                msgBody = '[FOTO]';
                break;
            case 'sticker':
                msgBody = '[STICKER]';
                break;
            case 'document':
                msgBody = `[DOCUMENTO: ${msg.document.filename || 'archivo'}]`;
                break;
            case 'audio':
                msgBody = '[AUDIO]';
                break;
            default:
                msgBody = '[ARCHIVO NO SOPORTADO]';
        }

        if (msgBody) {
            if (!chats[from]) chats[from] = { from, customerName, messages: [] };
            const currentChat = chats[from];
            
            // Descarga de Multimedia
            let imageBase64 = null; // Para almacenar la imagen inline y que sea siempre visible
            if (['image', 'sticker', 'document', 'audio'].includes(msg.type)) {
                const mediaData = msg[msg.type];
                const mediaId = mediaData.id;
                console.log(`📥 ${msg.type.toUpperCase()} recibido de ${customerName}. Descargando...`);
                
                try {
                    const buffer = await downloadMetaMedia(mediaId);
                    if (buffer) {
                        const ext = msg.type === 'document' ? (msg.document.filename?.split('.').pop() || 'file') : (msg.type === 'image' ? 'jpg' : (msg.type === 'sticker' ? 'webp' : 'ogg'));
                        const fileName = `${Date.now()}-${from}.${ext}`;
                        const filePath = path.join(UPLOADS_DIR, fileName);
                        fs.writeFileSync(filePath, buffer);
                        mediaUrl = `/uploads/${fileName}`;
                        
                        // Guardar imagen como base64 inline para visualización persistente
                        if (msg.type === 'image' || msg.type === 'sticker') {
                            const mimeType = msg.type === 'sticker' ? 'image/webp' : 'image/jpeg';
                            imageBase64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
                        }
                        
                        // GPT Vision analysis si es imagen
                        if (msg.type === 'image') {
                            try {
                                const visionResult = await analyzeImage(buffer);
                                // Guardar el resultado del análisis en el mensaje para que la IA lo sepa
                                if (visionResult.isReceipt) {
                                    lastReceiptFrom = from;
                                    currentChat.lastImageAnalysis = 'COMPROBANTE_DE_PAGO';
                                    
                                    // Cambiar etiqueta a 'pago-pendiente' inicialmente
                                    if (!currentChat.tags?.includes('pago-pendiente')) {
                                        currentChat.tags = [...(currentChat.tags || []), 'pago-pendiente'];
                                    }

                                    // Lógica de Pago Automático y Entrega
                                    const alreadyDelivered = currentChat.tags?.includes('entregado') || credentialsSentInChat(currentChat);
                                    
                                    if (alreadyDelivered) {
                                        // Confirmar el pago de ventas existentes
                                        currentChat.tags = (currentChat.tags || []).filter(t => t !== 'entregado' && t !== 'pago-pendiente');
                                        if (!currentChat.tags.includes('pagado')) {
                                            currentChat.tags.push('pagado');
                                        }
                                        currentChat.updatedAt = Date.now();
                                        saveChats(chats);
                                        io.emit('tag_updated', { from, tags: currentChat.tags });

                                        // Sincronizar estado de ventas a pagado
                                        const customerSales = sales.filter(s => s.customerId === from && !s.paid);
                                        if (customerSales.length > 0) {
                                            customerSales.forEach(s => s.paid = true);
                                            saveSales(sales);
                                            io.emit('sales_updated', sales);
                                        }

                                        const confirmMsg = '✅ *¡Pago verificado automáticamente!* Muchas gracias por tu compra. 🎉';
                                        await smartSendMessage(from, confirmMsg);
                                        const botMsg = { id: 'conf-'+Date.now(), from, body: confirmMsg, isMe: true, role: 'bot', timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }), timestampRaw: Date.now() };
                                        currentChat.messages.push({ ...botMsg, content: confirmMsg });
                                        io.emit('message', botMsg);

                                        if (ADMIN_PHONE) {
                                            await smartSendMessage(ADMIN_PHONE, `✅ *PAGO AUTO-CONFIRMADO* de *${customerName}* (${from}). Venta marcada como pagada.`);
                                        }
                                        
                                        // Cancelar recordatorio de pago si existe
                                        if (paymentReminderTimers[from]) {
                                            clearTimeout(paymentReminderTimers[from]);
                                            delete paymentReminderTimers[from];
                                        }
                                    } else {
                                        // Aún no tiene cuenta entregada. Intentamos entregarla ahora y marcar como pagada.
                                        console.log(`🤖 [AUTO] Intentando entrega y pago automático para ${customerName}`);
                                        const deliveryResult = await executeDelivery(from, 'deliver_and_paid');
                                        if (deliveryResult.success) {
                                            if (ADMIN_PHONE) {
                                                await smartSendMessage(ADMIN_PHONE, `✅ *ENTREGA Y PAGO AUTO-CONFIRMADO* para *${customerName}* (${from}).`);
                                            }
                                        } else {
                                            console.error(`❌ [AUTO] Falló executeDelivery para ${customerName}:`, deliveryResult.error);
                                            if (ADMIN_PHONE) {
                                                await smartSendMessage(ADMIN_PHONE, `⚠️ *PAGO DETECTADO* de *${customerName}* (${from}) pero falló la entrega: ${deliveryResult.error}`);
                                            }
                                        }
                                    }
                                    saveChats(chats);
                                } else {
                                    currentChat.lastImageAnalysis = visionResult.description;
                                }
                            } catch (vErr) {
                                console.error('Vision analysis error:', vErr);
                                currentChat.lastImageAnalysis = 'No se pudo analizar la imagen';
                            }
                        }

                        // OpenAI Whisper transcription for audio
                        if (msg.type === 'audio' && openai) {
                            try {
                                const transcription = await openai.audio.transcriptions.create({
                                    file: fs.createReadStream(filePath),
                                    model: "whisper-1",
                                    language: "es"
                                });
                                if (transcription && transcription.text) {
                                    msgBody = `[AUDIO]: ${transcription.text}`;
                                    console.log(`🎙️ Transcripción de ${customerName}: ${transcription.text}`);
                                }
                            } catch (err) {
                                console.error('❌ [ERROR] Transcripción Whisper falló:', err.message);
                            }
                        }
                    } else {
                        console.error(`❌ [ERROR] Falló descarga de ${msg.type}. Revisa logs de downloadMetaMedia.`);
                        msgBody += ' (⚠️ Error de descarga)';
                    }
                } catch (e) {
                    console.error(`❌ [ERROR] Excepción procesando media ${msg.type}:`, e.message);
                    msgBody += ' (⚠️ Fallo técnico)';
                }
            }

            const mediaId = msg.type !== 'text' ? msg[msg.type]?.id : null;
            const newMessage = { 
                id: msg.id, 
                mediaId: mediaId,
                from, 
                body: msgBody, content: msgBody, 
                imageUrl: (msg.type === 'image' || msg.type === 'sticker') 
                    ? (mediaUrl || (mediaId ? `/api/media/${mediaId}` : null)) 
                    : null,
                imageBase64: imageBase64 || null, // Base64 inline para visualización persistente
                fileUrl: (msg.type === 'document' || msg.type === 'audio') 
                    ? (mediaUrl || (mediaId ? `/api/media/${mediaId}` : null)) 
                    : null,
                timestampRaw: Date.now(), role: 'user' 
            };
            
            // --- MANEJO DE AUDIO (Whisper) ---
            if (msg.type === 'audio' && newMessage.fileUrl) {
                const filePath = path.join(__dirname, newMessage.fileUrl);
                if (fs.existsSync(filePath)) {
                    console.log(`🎙️ Transcribiendo audio de ${customerName}...`);
                    try {
                        const transcription = await openai.audio.transcriptions.create({
                            file: fs.createReadStream(filePath),
                            model: "whisper-1",
                        });
                        newMessage.body = `🎙️ (Audio): ${transcription.text}`;
                        newMessage.content = newMessage.body;
                    } catch (e) { console.error('Whisper error:', e); }
                }
            }

            currentChat.messages.push(newMessage);
            currentChat.updatedAt = Date.now();
            if (recoveryTimers[from]) clearTimeout(recoveryTimers[from]);
            saveChats(chats); io.emit('message', { ...newMessage, customerName });

            handleIncomingMessage(from);
        }
    }
    res.sendStatus(200);
});

// Función centralizada para procesar la IA y lógica de negocio
async function processAIResponse(from, msgBodyLower) {
    const refreshedChat = chats[from];
    const customerName = refreshedChat.customerName;

    // Detección de soporte (cliente existente con problema)
    const supportRegex = /no (puedo|me deja|funciona|entra|sirve|carga|abre)|error|caído|cayó|problema|garant[ií]a|devolu|reclam|queja|no (se ve|se puede|anda)|demasiadas|muchas personas|perfil.*(no|bloqueado)|pagué|pagado|ya pag/i;
    const isSupport = supportRegex.test(msgBodyLower);

    if (isSupport) {
        if (!refreshedChat.tags?.includes('soporte')) {
            refreshedChat.tags = [...(refreshedChat.tags || []), 'soporte'];
        }
        refreshedChat.aiDisabled = true; // Apagar IA
        saveChats(chats);
        io.emit('tag_updated', { from, tags: refreshedChat.tags });
        io.emit('ai_state_updated', { chatId: from, disabled: true });
        
        const supportMsg = "Veo que necesitas ayuda. 👩‍💻 En breve te comunicaremos con atención humana para resolver tu solicitud.";
        await smartSendMessage(from, supportMsg);
        
        const botMsg = { id: 'bot-'+Date.now(), from, body: supportMsg, content: supportMsg, isMe: true, role: 'bot', timestampRaw: Date.now() };
        refreshedChat.messages.push(botMsg);
        saveChats(chats); io.emit('message', botMsg);

        if (ADMIN_PHONE) smartSendMessage(ADMIN_PHONE, `⚠️ *SOPORTE REQUERIDO* por *${customerName}*. La IA se ha apagado para este chat.`);
        
        delete aiTimers[from];
        return; // Detener flujo IA y no llamar a OpenAI
    }

    const isPricingInquiry = (/\?|qué val|que val|precio|costo|cuánto|cuanto|valor|promoción|promo|descuento/i.test(msgBodyLower));
    
    // Nueva protección: ¿El mensaje es SOLO el nombre de una plataforma?
    const platformNames = getPlatformNames();
    const isOnlyProductName = platformNames.includes(msgBodyLower) || platformNames.some(p => msgBodyLower === `quiere ${p}` || msgBodyLower === `quiero ${p}`);

    // Auto-confirmación (ahora detecta la palabra en cualquier parte de la frase)
    const confirmWords = /\b(si|sí|dale|ok|listo|recibido|proceder|hagale|hágale|de una|deuna|ready|mándala|mandala|pásala|pasala|manda|pasa|venda|véndame|activar|activa|pruébala|pruebala|probar|enviamelas|envialas|enviame)\b/i;
    const containsExplicitConfirmation = confirmWords.test(msgBodyLower);

    if (!isPricingInquiry && !isOnlyProductName && containsExplicitConfirmation) {
        const offeredAt = refreshedChat.activationOfferedAt || 0;
        const recoveredAt = refreshedChat.recoverySentAt || 0;
        const alreadyDelivered = credentialsSentInChat(refreshedChat);
        // Entregar si hubo oferta de activación reciente o si pide explícitamente enviar
        if (!alreadyDelivered && (Date.now() - offeredAt < 1800000 || Date.now() - recoveredAt < 1800000 || msgBodyLower.includes('activa') || msgBodyLower.includes('envia'))) {
            try {
                await executeDelivery(from, 'auto');
            } catch (err) {
                console.error('Delivery Error:', err);
                refreshedChat.aiDisabled = true;
                io.emit('ai_state_updated', { chatId: from, disabled: true });
                await smartSendMessage(from, "Lo siento, tuve un pequeño problema técnico procesando tu cuenta. 👩‍💻 Un humano te ayudará en unos momentos.");
                if (ADMIN_PHONE) smartSendMessage(ADMIN_PHONE, `❌ *ERROR DE ENTREGA* con *${customerName}*. La IA se ha apagado.`);
            }
            delete aiTimers[from];
            return;
        }
    }
    
    // Intención de activación - Solo si NO es soporte y NO se han enviado credenciales
    const activateRegex = /activ(a|ar|ame|alo)|quiero prob(ar|arla)|déjame prob|me la activas|actívala|actívamela|enviame|mándame|pásame/i;
    if (!credentialsSentInChat(refreshedChat) && activateRegex.test(msgBodyLower)) {
        try {
            await executeDelivery(from, 'auto');
            refreshedChat.activationNotifySent = true;
            refreshedChat.activationOfferedAt = Date.now();
        } catch (err) {
            console.error('Activation Delivery Error:', err);
            refreshedChat.aiDisabled = true;
            io.emit('ai_state_updated', { chatId: from, disabled: true });
            await smartSendMessage(from, "Lo siento, tuve un pequeño problema técnico procesando tu cuenta. 👩‍💻 Un humano te ayudará en unos momentos.");
            if (ADMIN_PHONE) smartSendMessage(ADMIN_PHONE, `❌ *ERROR DE ACTIVACIÓN* con *${customerName}*. La IA se ha apagado.`);
        }
        delete aiTimers[from];
        return; // Detener para que la IA no responda duplicado
    }

    // Respuesta IA - Pasar contexto según la situación del chat
    const allMessages = refreshedChat.messages.slice(-15);
    if (credentialsSentInChat(refreshedChat)) {
        allMessages.push({ role: 'system', content: '✅ CONTEXTO: Ya se enviaron las credenciales de acceso a este cliente y se le hizo el cobro. Estás en la etapa de COBRO/CONFIRMACIÓN. Solo responde preguntas sobre el precio, el pago o el funcionamiento. NUNCA ofrezcas ni entregues otra cuenta.' });
    }
    
    // Pasar información de análisis de imagen si existe
    if (refreshedChat.lastImageAnalysis) {
        allMessages.push({ role: 'system', content: `CONTEXTO VISUAL: La última imagen enviada por el usuario fue analizada por visión artificial como: "${refreshedChat.lastImageAnalysis}". Si NO es un comprobante de pago, responde según lo que la imagen realmente muestra. Si ES un comprobante, di que estás verificándolo.` });
        // Limpiar después de usar para que no afecte mensajes futuros
        delete refreshedChat.lastImageAnalysis;
        saveChats(chats);
    }

    const aiReply = await getAIResponse(msgBodyLower, allMessages);
    
    // --- APAGADO POR IA ---
    const gptRequestedSupport = /\[APAGAR_BOT_SOPORTE\]/i.test(aiReply);
    if (gptRequestedSupport) {
        if (!refreshedChat.tags?.includes('soporte')) {
            refreshedChat.tags = [...(refreshedChat.tags || []), 'soporte'];
        }
        refreshedChat.aiDisabled = true;
        saveChats(chats);
        io.emit('tag_updated', { from, tags: refreshedChat.tags });
        io.emit('ai_state_updated', { chatId: from, disabled: true });
        
        const supportMsg = "Veo que necesitas ayuda. 👩‍💻 En breve te comunicaremos con atención humana para resolver tu solicitud.";
        await smartSendMessage(from, supportMsg);
        
        const botMsg = { id: 'bot-'+Date.now(), from, body: supportMsg, content: supportMsg, isMe: true, role: 'bot', timestampRaw: Date.now() };
        refreshedChat.messages.push(botMsg);
        saveChats(chats); io.emit('message', botMsg);

        if (ADMIN_PHONE) smartSendMessage(ADMIN_PHONE, `⚠️ *SOPORTE REQUERIDO* por *${customerName}* (Detectado por IA). La IA se ha apagado.`);
        
        delete aiTimers[from];
        return; // Detener flujo
    }

    // GPT-4 es inteligente, le damos autoridad a su etiqueta si el prompt está bien configurado
    const gptDecidedToDeliver = /\[ENTREGAR_AHORA\]/i.test(aiReply);
    
    // Permitimos la entrega si pasamos las pruebas heurísticas locales, o si GPT lo decidió explícitamente (tiene prioridad)
    const localDecision = !isPricingInquiry && !isOnlyProductName && containsExplicitConfirmation;
    const canAutoDeliver = (localDecision || gptDecidedToDeliver) && !credentialsSentInChat(refreshedChat);
    
    const hasPurchaseIntent = canAutoDeliver && (/\[PAGO_PENDIENTE\]/i.test(aiReply) || /\[PRODUCTOS:.+\]/i.test(aiReply));
    const forceDelivery = canAutoDeliver && gptDecidedToDeliver;

    if (hasPurchaseIntent) {
        // Guardar productos detectados para que executeDelivery los use
        const prodsMatch = aiReply.match(/\[PRODUCTOS:(.+?)\]/i);
        const totalMatch = aiReply.match(/\[TOTAL:(\d+?)\]/i);
        if (prodsMatch) refreshedChat.pendingProducts = prodsMatch[1].split(',').map(p => p.trim());
        if (totalMatch) refreshedChat.pendingTotal = totalMatch[1];
        
        // SOLO poner etiqueta si NO vamos a intentar entrega inmediata
        // Si forceDelivery es true, executeDelivery pondrá la etiqueta correcta según el resultado
        if (!forceDelivery && !refreshedChat.tags?.includes('pago-pendiente')) {
            refreshedChat.tags = [...(refreshedChat.tags || []), 'pago-pendiente'];
            saveChats(chats); io.emit('tag_updated', { from, tags: refreshedChat.tags });
        } else {
            saveChats(chats);
        }
    }

    const cleanReply = aiReply.replace(/\[PAGO_PENDIENTE\]|\[PRODUCTOS:.+?\]|\[TOTAL:\d+?\]|\[ENTREGAR_AHORA\]|\[APAGAR_BOT_SOPORTE\]/gi, '').trim();
    
    if (forceDelivery) {
        const deliveryResult = await executeDelivery(from, 'auto');
        if (!deliveryResult.success) {
            // executeDelivery ya envió el mensaje y apagó la IA si fue por falta de stock.
            // Solo necesitamos apagar aquí si fue otro tipo de error.
            if (!refreshedChat.aiDisabled) {
                refreshedChat.aiDisabled = true;
                if (!refreshedChat.tags?.includes('soporte')) {
                    refreshedChat.tags = [...(refreshedChat.tags || []), 'soporte'];
                }
                saveChats(chats);
                io.emit('ai_state_updated', { chatId: from, disabled: true });
                io.emit('tag_updated', { from, tags: refreshedChat.tags });
            }
        }
    } else {
        await delay(1500);
        if (cleanReply) {
            await smartSendMessage(from, cleanReply);
            const botMsg = { id: 'bot-'+Date.now(), from, body: cleanReply, content: cleanReply, isMe: true, role: 'bot', timestampRaw: Date.now() };
            refreshedChat.messages.push(botMsg);
            saveChats(chats); io.emit('message', botMsg);
        }
    }
    
    scheduleRecovery(from);
    delete aiTimers[from];
}

app.post('/webhook/messenger', async (req, res) => {
    const body = req.body;
    if (body.object === 'page') {
        body.entry.forEach(async (entry) => {
            const webhook_event = entry.messaging[0];
            const sender_psid = webhook_event.sender.id;

            if (webhook_event.message && webhook_event.message.text) {
                const msgBody = webhook_event.message.text;
                
                if (!chats[sender_psid]) {
                    chats[sender_psid] = { 
                        from: sender_psid, 
                        customerName: `Messenger User ${sender_psid.substring(0,4)}`, 
                        messages: [],
                        platform: 'messenger' // Identificador clave
                    };
                }
                const currentChat = chats[sender_psid];
                currentChat.platform = 'messenger'; // Asegurar plataforma

                const newMessage = { 
                    id: webhook_event.message.mid, 
                    from: sender_psid, 
                    body: msgBody, 
                    content: msgBody, 
                    timestampRaw: Date.now(), 
                    role: 'user',
                    platform: 'messenger'
                };

                currentChat.messages.push(newMessage);
                currentChat.updatedAt = Date.now();
                saveChats(chats);
                io.emit('message', { ...newMessage, customerName: currentChat.customerName });

                // Aquí reutilizamos TODA tu lógica de IA existente (aiTimers, executeDelivery, etc.)
                // Solo necesitamos que sendMessageToCloudAPI sea inteligente.
                handleIncomingMessage(sender_psid);
            }
        });
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// Función auxiliar para unificar la lógica de IA (Refactorización)
function handleIncomingMessage(from) {
    if (aiTimers[from]) clearTimeout(aiTimers[from]);
    
    const currentChat = chats[from];
    if (currentChat.aiDisabled || currentChat.isBlocked) return;

    aiTimers[from] = setTimeout(async () => {
        const refreshedChat = chats[from];
        
        // Evitar que la IA responda si el último mensaje ya es del bot/sistema
        const messages = refreshedChat.messages || [];
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.role === 'bot' || lastMsg.isMe) {
                console.log(`ℹ️ [SISTEMA] Ignorando respuesta de IA para ${refreshedChat.customerName} porque el último mensaje ya es del bot.`);
                delete aiTimers[from];
                return;
            }
        }

        const lastUserMsg = refreshedChat.messages.filter(m => m.role === 'user').slice(-1)[0];
        if (!lastUserMsg) return;

        const msgBodyLower = (lastUserMsg.content || '').toLowerCase().trim();

        processAIResponse(from, msgBodyLower);
    }, 15000);
}

// Nueva función de envío unificada
async function smartSendMessage(to, text) {
    const chat = chats[to];
    const platform = chat?.platform || 'whatsapp';

    if (platform === 'messenger') {
        return sendMessageToMessengerAPI(to, text);
    } else {
        return sendMessageToCloudAPI(to, text);
    }
}

async function sendMessageToMessengerAPI(psid, text) {
    if (!MESSENGER_PAGE_TOKEN || !psid) return;
    try {
        const res = await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${MESSENGER_PAGE_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { id: psid },
                message: { text: text }
            })
        });
        if (!res.ok) {
            const errData = await res.text();
            console.error(`❌ [MESSENGER ERROR] al enviar a ${psid}:`, errData);
        }
    } catch (err) { console.error('Messenger send error:', err); }
}

async function downloadMetaMedia(mediaId) {
    try {
        console.log(`📡 [META] Paso 1: Obteniendo URL para Media ID: ${mediaId}`);
        const response = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
            headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
        });
        const data = await response.json();
        
        if (!data.url) {
            console.error('❌ [META] No se obtuvo URL:', JSON.stringify(data));
            return null;
        }
        console.log(`📡 [META] Paso 2: URL obtenida. Descargando con redirect manual...`);
        
        // Paso 2: Manejar redirecciones manualmente para preservar el header Authorization
        // Node.js fetch lo elimina automáticamente en cross-origin redirects (graph.facebook.com → lookaside.fbsbx.com)
        let downloadUrl = data.url;
        let attempts = 0;
        
        while (attempts < 5) {
            const mediaRes = await fetch(downloadUrl, {
                headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` },
                redirect: 'manual'  // NO seguir redirects automáticamente
            });
            
            // Si es un redirect (301, 302, 303, 307, 308), seguirlo manualmente
            if ([301, 302, 303, 307, 308].includes(mediaRes.status)) {
                downloadUrl = mediaRes.headers.get('location');
                console.log(`📡 [META] Redirect ${mediaRes.status} → ${downloadUrl?.substring(0, 80)}...`);
                attempts++;
                continue;
            }
            
            // Si llegamos a la respuesta final
            if (mediaRes.ok) {
                console.log(`✅ [META] Descarga exitosa. Content-Type: ${mediaRes.headers.get('content-type')}`);
                return Buffer.from(await mediaRes.arrayBuffer());
            } else {
                const errorBody = await mediaRes.text().catch(() => 'No body');
                console.error(`❌ [META] Descarga falló. Status: ${mediaRes.status}, Body: ${errorBody.substring(0, 200)}`);
                return null;
            }
        }
        
        console.error('❌ [META] Demasiados redirects');
        return null;
    } catch (err) { 
        console.error('❌ [META CRITICAL]', err.message); 
        return null; 
    }
}

// Análisis visual completo de imágenes con GPT Vision
async function analyzeImage(buffer) {
    if (!openai) return { isReceipt: false, description: 'Sin OpenAI' };
    try {
        const base64 = buffer.toString('base64');
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: `Eres un asistente de análisis visual experto en verificar comprobantes de pago de servicios bancarios colombianos (Nequi, Bancolombia, Daviplata, etc.).
Analiza la imagen y responde en este formato EXACTO:
TIPO: [COMPROBANTE_PAGO | MEME | CAPTURA_PANTALLA | SELFIE | PRODUCTO | OTRO]
DESCRIPCION: [Breve descripción de 1 línea de lo que ves]

Un COMPROBANTE_PAGO es un recibo real de transferencia bancaria. Para ser válido, DEBE mostrar claramente la mayor parte de la siguiente información:
1. El logo o nombre del banco/billetera (Nequi, Bancolombia, Daviplata, etc.)
2. El monto de la transacción (dinero transferido)
3. La fecha y hora de la transacción
4. Un número de referencia, ID de transacción, aprobación, o número de comprobante.
Si es una captura de pantalla de un chat de WhatsApp, una foto de un producto, un meme, un saldo de cuenta sin transferencia, o una imagen borrosa donde no se leen los datos, clasifícala como OTRO.` },
                { role: "user", content: [
                    { type: "text", text: "Analiza esta imagen." },
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}` } }
                ]}
            ],
            max_tokens: 150
        });
        const reply = response.choices[0].message.content;
        const isReceipt = reply.includes('COMPROBANTE_PAGO');
        const descMatch = reply.match(/DESCRIPCION:\s*(.+)/i);
        const description = descMatch ? descMatch[1].trim() : reply.split('\n').pop().trim();
        
        console.log(`👁️ [VISION] Resultado: ${isReceipt ? 'COMPROBANTE' : 'OTRO'} - ${description}`);
        return { isReceipt, description };
    } catch (err) { 
        console.error('GPT Vision error:', err); 
        return { isReceipt: false, description: 'Error de análisis' };
    }
}

// --- API & SOCKETS ---
app.get('/api/media/:mediaId', async (req, res) => {
    const { mediaId } = req.params;
    if (!WHATSAPP_TOKEN) return res.status(500).send('No token');

    try {
        // Reutilizamos downloadMetaMedia que ya maneja redirects correctamente
        const buffer = await downloadMetaMedia(mediaId);
        if (!buffer) return res.status(404).send('Media not found or download failed');
        
        // Detectar tipo de contenido por los primeros bytes (magic bytes)
        let contentType = 'application/octet-stream';
        if (buffer[0] === 0xFF && buffer[1] === 0xD8) contentType = 'image/jpeg';
        else if (buffer[0] === 0x89 && buffer[1] === 0x50) contentType = 'image/png';
        else if (buffer[0] === 0x52 && buffer[1] === 0x49) contentType = 'image/webp';
        else if (buffer[0] === 0x47 && buffer[1] === 0x49) contentType = 'image/gif';
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(buffer);
    } catch (err) { 
        console.error('❌ [PROXY ERROR]:', err.message); 
        res.status(500).send('Error');
    }
});

// --- LOGICA DE CAMPAÑAS MASIVAS ---
const activeCampaigns = {};

async function processCampaign(campaignId) {
    if (activeCampaigns[campaignId]) return;
    activeCampaigns[campaignId] = true;
    console.log(`📢 [CAMPAÑAS] Iniciando procesamiento de campaña ${campaignId}`);

    while (activeCampaigns[campaignId]) {
        const campaign = campaigns.find(c => c.id === campaignId);
        if (!campaign || campaign.status !== 'processing') {
            console.log(`📢 [CAMPAÑAS] Deteniendo procesamiento de campaña ${campaignId}. Estado actual: ${campaign ? campaign.status : 'inexistente'}`);
            delete activeCampaigns[campaignId];
            break;
        }

        const nextContact = campaign.contacts.find(c => c.status === 'pending');
        if (!nextContact) {
            campaign.status = 'completed';
            saveCampaigns(campaigns);
            io.emit('campaigns_updated', campaigns);
            delete activeCampaigns[campaignId];
            console.log(`📢 [CAMPAÑAS] Campaña ${campaignId} completada.`);
            break;
        }

        try {
            const targetChat = chats[nextContact.chatId];
            const customerName = targetChat?.customerName || nextContact.name || 'Cliente';
            const parsedMessage = campaign.message.replace(/\{\{\s*nombre\s*\}\}/gi, customerName);

            console.log(`📡 [CAMPAÑAS] Enviando mensaje a ${nextContact.name} (${nextContact.chatId})`);
            await smartSendMessage(nextContact.chatId, parsedMessage);

            const m = {
                id: 'camp-' + Date.now() + '-' + Math.random(),
                from: nextContact.chatId,
                body: parsedMessage,
                content: parsedMessage,
                isMe: true,
                role: 'bot',
                timestampRaw: Date.now(),
                timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
            };
            
            if (!chats[nextContact.chatId]) {
                chats[nextContact.chatId] = { from: nextContact.chatId, customerName, messages: [] };
            }
            chats[nextContact.chatId].messages.push(m);
            chats[nextContact.chatId].updatedAt = Date.now();
            saveChats(chats);
            io.emit('message', { ...m, customerName });

            nextContact.status = 'sent';
            campaign.sentCount++;
        } catch (err) {
            console.error(`❌ [CAMPAÑAS ERROR] al enviar a ${nextContact.chatId}:`, err);
            nextContact.status = 'failed';
            nextContact.error = err.message || 'Error desconocido';
            campaign.failedCount++;
        }

        saveCampaigns(campaigns);
        io.emit('campaigns_updated', campaigns);

        // Espera con delay dinámico y aleatorio +/- 20%
        const baseDelay = (campaign.delay || 20) * 1000;
        const randomDelay = Math.floor(baseDelay * (0.8 + Math.random() * 0.4));
        
        let elapsed = 0;
        const interval = 1000;
        while (elapsed < randomDelay) {
            await delay(interval);
            elapsed += interval;
            const currentCampaign = campaigns.find(c => c.id === campaignId);
            if (!currentCampaign || currentCampaign.status !== 'processing') {
                delete activeCampaigns[campaignId];
                return;
            }
        }
    }
}

app.get('/api/inventory', (req, res) => res.json(inventory));
app.post('/api/inventory', (req, res) => { inventory = req.body; saveInventory(inventory); io.emit('inventory_updated', inventory); res.json({success:true}); });
app.get('/api/sales', (req, res) => res.json(sales));
app.post('/api/sales', (req, res) => { sales = req.body; saveSales(sales); io.emit('sales_updated', sales); res.json({success:true}); });
app.get('/api/platforms', (req, res) => res.json(platforms));
app.post('/api/platforms', (req, res) => { platforms = req.body; savePlatforms(platforms); io.emit('platforms_updated', platforms); res.json({success:true}); });
app.get('/api/providers', (req, res) => res.json(providers));
app.post('/api/providers', (req, res) => { providers = req.body; saveProviders(providers); io.emit('providers_updated', providers); res.json({success:true}); });

io.on('connection', (socket) => {
    socket.emit('inventory_updated', inventory);
    socket.emit('sales_updated', sales);
    socket.emit('initial_chats', chats);
    socket.emit('initial_settings', settings);
    socket.emit('platforms_updated', platforms);
    socket.emit('providers_updated', providers);
    socket.emit('campaigns_updated', campaigns);

    socket.on('create_campaign', (data) => {
        const targets = [];
        const isAll = data.targetTags === 'all' || (Array.isArray(data.targetTags) && data.targetTags.includes('all'));
        
        Object.keys(chats).forEach(chatId => {
            if (ADMIN_PHONE && chatId === ADMIN_PHONE) return;
            const chat = chats[chatId];
            const tags = chat.tags || [];
            
            let matches = false;
            if (isAll) {
                matches = true;
            } else if (Array.isArray(data.targetTags)) {
                matches = data.targetTags.some(t => tags.includes(t));
            }
            
            // Lógica de exclusión
            if (matches && Array.isArray(data.excludeTags) && data.excludeTags.length > 0) {
                const isExcluded = data.excludeTags.some(t => tags.includes(t));
                if (isExcluded) {
                    matches = false;
                }
            }
            
            if (matches) {
                targets.push({
                    chatId: chatId,
                    name: chat.customerName || chatId,
                    status: 'pending'
                });
            }
        });
        
        const newCampaign = {
            id: 'camp-' + Date.now(),
            name: data.name,
            message: data.message,
            targetTags: data.targetTags,
            excludeTags: data.excludeTags || [],
            delay: parseInt(data.delay) || 20,
            status: 'pending',
            totalContacts: targets.length,
            sentCount: 0,
            failedCount: 0,
            contacts: targets,
            createdAt: Date.now()
        };
        
        campaigns.push(newCampaign);
        saveCampaigns(campaigns);
        io.emit('campaigns_updated', campaigns);
    });

    socket.on('start_campaign', (campaignId) => {
        const campaign = campaigns.find(c => c.id === campaignId);
        if (campaign && (campaign.status === 'pending' || campaign.status === 'paused')) {
            campaign.status = 'processing';
            saveCampaigns(campaigns);
            io.emit('campaigns_updated', campaigns);
            processCampaign(campaignId);
        }
    });

    socket.on('pause_campaign', (campaignId) => {
        const campaign = campaigns.find(c => c.id === campaignId);
        if (campaign && campaign.status === 'processing') {
            campaign.status = 'paused';
            saveCampaigns(campaigns);
            io.emit('campaigns_updated', campaigns);
            if (activeCampaigns[campaignId]) {
                delete activeCampaigns[campaignId];
            }
        }
    });

    socket.on('delete_campaign', (campaignId) => {
        campaigns = campaigns.filter(c => c.id !== campaignId);
        saveCampaigns(campaigns);
        io.emit('campaigns_updated', campaigns);
        if (activeCampaigns[campaignId]) {
            delete activeCampaigns[campaignId];
        }
    });

    socket.on('sync_settings', (data) => { settings = data; saveSettings(settings); });
    socket.on('sync_inventory', (data) => { inventory = data; saveInventory(inventory); socket.broadcast.emit('inventory_updated', inventory); });
    socket.on('sync_sales', (data) => { sales = data; saveSales(sales); socket.broadcast.emit('sales_updated', sales); });
    socket.on('sync_platforms', (data) => { platforms = data; savePlatforms(platforms); socket.broadcast.emit('platforms_updated', platforms); });
    socket.on('sync_providers', (data) => { providers = data; saveProviders(providers); socket.broadcast.emit('providers_updated', providers); });
    
    socket.on('delete_chat', (chatId) => {
        if (chats[chatId]) {
            delete chats[chatId];
            saveChats(chats);
            io.emit('chat_deleted', chatId);
            console.log(`🗑️ [SISTEMA] Chat de ${chatId} eliminado.`);
        }
    });

    socket.on('delete_message', ({ chatId, messageId }) => {
        if (chats[chatId] && chats[chatId].messages) {
            chats[chatId].messages = chats[chatId].messages.filter(m => m.id !== messageId && m.timestampRaw !== messageId);
            saveChats(chats);
            io.emit('message_deleted', { chatId, messageId });
            console.log(`🗑️ [SISTEMA] Mensaje ${messageId} del chat ${chatId} eliminado.`);
        }
    });

    socket.on('toggle_ai', ({ chatId, disabled }) => {
        if (chats[chatId]) {
            chats[chatId].aiDisabled = disabled;
            saveChats(chats);
            io.emit('ai_state_updated', { chatId, disabled });
        }
    });

    socket.on('toggle_block', ({ chatId, blocked }) => {
        if (chats[chatId]) {
            chats[chatId].isBlocked = blocked;
            saveChats(chats);
            io.emit('block_state_updated', { chatId, blocked });
            console.log(`🚫 [SISTEMA] Chat de ${chatId} ${blocked ? 'bloqueado' : 'desbloqueado'}.`);
        }
    });

    socket.on('test_ai', async (data, callback) => callback(await getAIResponse(data.content, data.history)));
    socket.on('update_chat_tags', ({ chatId, tags }) => { 
        if (chats[chatId]) { 
            chats[chatId].tags = tags; 
            saveChats(chats); 
            
            // Sincronizar estado de ventas basado en la etiqueta
            if (tags.includes('pagado')) {
                const customerSales = sales.filter(s => s.customerId === chatId && !s.paid);
                if (customerSales.length > 0) {
                    customerSales.forEach(s => s.paid = true);
                    saveSales(sales);
                    io.emit('sales_updated', sales);
                }
            } else if (tags.includes('pago-pendiente')) {
                const customerSales = sales.filter(s => s.customerId === chatId && s.paid);
                if (customerSales.length > 0) {
                    customerSales.forEach(s => s.paid = false);
                    saveSales(sales);
                    io.emit('sales_updated', sales);
                }
            }
            
            io.emit('tag_updated', { from: chatId, tags }); 
        } 
    });
    socket.on('send_message', async ({ to, content }) => {
        if (/^r$/i.test(content.trim())) { await executeDelivery(to, 'deliver_first'); return; }
        await smartSendMessage(to, content);
        const m = { id: 'man-'+Date.now(), from: to, body: content, content, isMe: true, role: 'bot', timestampRaw: Date.now() };
        if (!chats[to]) chats[to] = { from: to, customerName: 'Cliente', messages: [] };
        chats[to].messages.push(m); chats[to].updatedAt = Date.now(); 
        
        // Si el admin envió credenciales manualmente, marcar el chat
        const lowerContent = content.toLowerCase();
        if ((lowerContent.includes('correo') || lowerContent.includes('email')) && 
            (lowerContent.includes('clave') || lowerContent.includes('contraseña') || lowerContent.includes('pass'))) {
            chats[to].credentialsDelivered = true;
            console.log(`✅ [SISTEMA] Credenciales manuales detectadas para ${chats[to].customerName}. Flag activado.`);
        }
        
        if (recoveryTimers[to]) clearTimeout(recoveryTimers[to]);
        saveChats(chats); io.emit('message', m);
        scheduleRecovery(to);
    });
});

async function sendMessageToCloudAPI(to, text) {
    if (!WHATSAPP_TOKEN || !PHONE_ID || !to) return;
    try {
        const cleanTo = String(to).replace(/[^0-9]/g, '');
        const res = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messaging_product: "whatsapp", to: cleanTo, type: "text", text: { body: text } })
        });
        if (!res.ok) {
            const errData = await res.text();
            console.error(`❌ [META ERROR] al enviar a ${cleanTo}:`, errData);
        }
    } catch (err) { console.error('Meta send error:', err); }
}

async function getAIResponse(message, history = []) {
    let activeOpenAI = openai;
    
    // Intento de recuperación si la variable no estaba lista al inicio
    if (!activeOpenAI && process.env.OPENAI_API_KEY) {
        console.log("📡 [SISTEMA] Inicializando OpenAI dinámicamente...");
        activeOpenAI = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    if (!activeOpenAI) {
        console.error("❌ [ERROR] OpenAI no disponible. Variable:", process.env.OPENAI_API_KEY ? 'Presente' : 'Ausente');
        return "⚠️ Error: El bot no tiene configurada la llave de inteligencia artificial en Railway.";
    }
    try {
        // Mostrar todo el inventario como disponible para la IA, sin importar el stock real
        const uniqueInventory = [];
        inventory.forEach(item => {
            if (!uniqueInventory.some(i => i.service === item.service)) {
                uniqueInventory.push(item);
            }
        });
        const inv = uniqueInventory.map(i => `${i.service} - $${i.price} (Disponible)`).join(', ');
        
        // Memoria de compras pasadas
        const customerSales = sales.filter(s => s.customerId === history[0]?.from || s.customer === history[0]?.customerName);
        const purchaseHistory = customerSales.length > 0 
            ? `Historial del cliente: Ha comprado ${customerSales.map(s => s.service).join(', ')} antes.`
            : "Cliente nuevo (sin compras previas).";

        // Regla inquebrantable de seguridad para evitar alucinaciones
        const antiHallucinationRules = "\n\n### REGLA INQUEBRANTABLE - PROHIBICIÓN DE DATOS FALSOS Y ENTREGA:\n1. NUNCA, BAJO NINGUNA CIRCUNSTANCIA, inventes correos, usuarios, contraseñas, perfiles o PINs. NO ENVÍES DATOS DE ACCESO EN TEXTO.\n2. Si el cliente pregunta cómo entrar, pide sus datos de acceso, o dice 'listo'/'ok' tras enviar un comprobante, Y AÚN NO SE LE HAN ENTREGADO LAS CUENTAS, debes responder ÚNICAMENTE con las etiquetas: [ENTREGAR_AHORA] [PRODUCTOS: NombrePlataforma]. (El sistema extraerá la cuenta real del inventario y se la enviará automáticamente).\n3. Si el cliente pide su cuenta y no sabes qué plataforma es, usa [APAGAR_BOT_SOPORTE] para que un humano revise.\n4. NUNCA digas 'tu cuenta está activada' o 'te envié la información por mensaje'. El sistema se encarga de todo.";

        const mathRules = "\n\n### REGLAS DE CÁLCULO (COMBOS):\n1. Si el cliente pide varios servicios, DEBES sumar sus precios individuales EXACTAMENTE como aparecen en el 'Stock actual'.\n2. PROHIBIDO inventar precios de 'combo'. Si Netflix vale 9.000 y Disney 11.000, el total ES 20.000. No redondees ni subas el precio.\n3. Antes de responder un total, realiza la suma paso a paso mentalmente. Error en la suma = Pérdida de cliente.";

        const comp = await activeOpenAI.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: `${settings.systemPrompt}${antiHallucinationRules}${mathRules}\n\n${purchaseHistory}\n\nStock actual para entrega instantánea (USA ESTOS PRECIOS): ${inv}` },
                ...history.map(m => ({ role: m.role==='user'?'user':'assistant', content: m.content||m.body })),
                { role: "user", content: message }
            ]
        });
        
        let reply = comp.choices[0].message.content;
        
        // Bloqueo duro por código para evitar alucinaciones
        if (/(usuario|correo|email|contraseña|clave|password):\s*(?!.*(te envié|sistema))/i.test(reply) || /te envié la información por mensaje/i.test(reply)) {
            console.log('⚠️ [SISTEMA] Alucinación detectada y bloqueada:', reply);
            
            // Si GPT decidió entregar la cuenta, conservamos las etiquetas para que el sistema haga la entrega real
            const tagsMatch = reply.match(/\[(ENTREGAR_AHORA|PRODUCTOS:[^\]]+|PAGO_PENDIENTE)\]/gi);
            if (tagsMatch) {
                reply = "Dame un momento, el sistema está procesando tu entrega... 😊 " + tagsMatch.join(' ');
            } else {
                reply = "[APAGAR_BOT_SOPORTE]";
            }
        }
        
        return reply;
    } catch (e) { 
        console.error('❌ OpenAI API Error:', e.message);
        return `⚠️ Error IA: ${e.message || 'Sin respuesta del cerebro'}`; 
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor CRM listo y escuchando en el puerto ${PORT}`);
});
