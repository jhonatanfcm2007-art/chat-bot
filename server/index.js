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

console.log('--- [SISTEMA] Diagnóstico de Variables ---');
console.log('OpenAI Key:', process.env.OPENAI_API_KEY ? `Detectada (${process.env.OPENAI_API_KEY.substring(0, 10)}...)` : '❌ FALTANTE');
console.log('WhatsApp Token:', WHATSAPP_TOKEN ? '✅ Detectado' : '❌ FALTANTE');
console.log('Phone ID:', PHONE_ID ? '✅ Detectado' : '❌ FALTANTE');
console.log('Admin Phone:', ADMIN_PHONE ? '✅ Detectado' : '❌ FALTANTE');

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
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use('/uploads', express.static(UPLOADS_DIR));

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
        systemPrompt: "Eres un asistente virtual de ventas y soporte para cuentas de streaming por WhatsApp. Sé cordial, breve y profesional. Usa emojis con moderación.\n\n### REGLA FUNDAMENTAL - DETECCIÓN DE INTENCIÓN:\nAntes de responder, SIEMPRE identifica si el cliente:\n- **CLIENTE NUEVO** → quiere COMPRAR una cuenta nueva o pregunta precios. Procede con la estrategia de VENTA.\n- **CLIENTE EXISTENTE CON PROBLEMA** → ya tiene una cuenta y tiene un problema. Procede con SOPORTE.\n\n### ESTRATEGIA DE VENTA (Cotización vs Confirmación):\n1. **COTIZACIÓN**: Si el cliente pregunta precios o lista plataformas para saber cuánto valen, responde solo con los precios y pregunta si desea proceder. NO entregues nada todavía.\n2. **CONFIRMACIÓN**: Solo si el cliente acepta EXPLÍCITAMENTE la oferta, dice 'Sí', 'Listo', 'Dale' o acepta probar la cuenta activada primero, añade [ENTREGAR_AHORA].\n3. Si el cliente lista plataformas después de que ofreciste 'activar primero', NO asumas que es un sí. Confirma primero: 'Perfecto, ¿te gustaría que te active esas 4 para que las pruebes?'\n\n### SI ES SOPORTE:\n1. NO intentes vender. Identifica el error y ofrece ayuda técnica.\n2. NUNCA pongas etiquetas [ENTREGAR_AHORA] en soporte.\n\n### REGLAS SOBRE PAGOS:\n- Si ya recibió cuenta para probar, dile: 'Quedo atento al comprobante de pago.'\n- NUNCA digas 'Gracias por tu compra' hasta que envíe el comprobante.\n\n### REGLAS DE COMPORTAMIENTO:\n1. Sé BREVE (máximo 2 líneas).\n2. Si el cliente envía varios mensajes seguidos, responde a todos en uno solo.\n3. Métodos de pago: Nequi, Daviplata o Bancolombia."
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

// --- DATA INITIALIZATION ---
let inventory = loadInventory();
let sales = loadSales();
let chats = loadChats();
let settings = loadSettings();
let platforms = loadPlatforms();
let providers = loadProviders();

const getPlatformNames = () => platforms.map(p => p.toLowerCase());

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const recoveryTimers = {};

function scheduleRecovery(to) {
    if (recoveryTimers[to]) clearTimeout(recoveryTimers[to]);
    
    const chat = chats[to];
    if (!chat) return;

    // No programar si ya tiene etiquetas de compra o pago en progreso
    const hasActiveTransaction = (chat.tags || []).some(t => ['pagado', 'entregado', 'pago-pendiente'].includes(t));
    if (hasActiveTransaction) return;

    recoveryTimers[to] = setTimeout(async () => {
        const c = chats[to];
        if (!c) return;
        
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


// --- CENTRAL DELIVERY FUNCTION ---
async function executeDelivery(to, mode = 'deliver_first') {
    const chat = chats[to];
    if (!chat) return { success: false, error: 'Chat not found' };
    if (chat.isAutoDelivering) return { success: false, error: 'Already delivering' };

    chat.isAutoDelivering = true;
    try {
        let productsToDeliver = chat.pendingProducts?.length > 0 ? chat.pendingProducts : null;

        if (!productsToDeliver) {
            // Solo buscamos productos en los últimos mensajes del USUARIO para evitar falsos positivos con lo que el bot ofrece
            const userText = (chat.messages || [])
                .filter(m => m.role === 'user')
                .slice(-3)
                .map(m => (m.content || m.body || '').toLowerCase())
                .join(' ');
            
            // Si el usuario mencionó específicamente un servicio que tenemos, lo marcamos
            productsToDeliver = inventory
                .filter(a => userText.includes(a.service.toLowerCase()))
                .map(a => a.service)
                .filter((v, i, arr) => arr.indexOf(v) === i);
        }

        if (!productsToDeliver || productsToDeliver.length === 0) {
            if (ADMIN_PHONE) sendMessageToCloudAPI(ADMIN_PHONE, `⚠️ No detecté productos para entregar a *${chat.customerName}*.`);
            return { success: false, error: 'No products detected' };
        }

        let totalMsg = `🚀 *¡Hola ${chat.customerName}! Aquí tienes tus cuentas activas:*\n\n`;
        let accountsFound = 0;
        const deliveredSales = [];

        for (const serviceName of productsToDeliver) {
            const accIndex = inventory.findIndex(a => a.service.toLowerCase().includes(serviceName.toLowerCase()) && (parseInt(a.uses) > 0));
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
                    email: acc.email, pass: acc.pass, profile: acc.profile, pin: acc.pin || '', expiration: acc.expiration || ''
                });

                deliveredSales.push(acc.service);
                acc.uses = parseInt(acc.uses) - 1;
                if (acc.uses <= 0) acc.status = 'Sold Out';

                totalMsg += `✅ *${acc.service}*\n📧 *Correo:* ${acc.email}\n🔑 *Clave:* ${acc.pass}${acc.profile ? '\n👤 *Perfil:* ' + acc.profile : ''}${acc.pin ? '\n📌 *PIN:* ' + acc.pin : ''}\n\n`;
                accountsFound++;
            }
        }

        if (accountsFound > 0) {
            totalMsg += `⚠️ No modificar datos para mantener tu garantía.`;
            await sendMessageToCloudAPI(to, totalMsg);

            chat.tags = (chat.tags || []).filter(t => t !== 'pago-pendiente');
            if (mode === 'deliver_and_paid') {
                if (!chat.tags.includes('pagado')) chat.tags.push('pagado');
                chat.tags = chat.tags.filter(t => t !== 'entregado');
            } else {
                if (!chat.tags.includes('entregado')) chat.tags.push('entregado');
                chat.tags = chat.tags.filter(t => t !== 'pagado');
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
            await sendMessageToCloudAPI(to, paymentMsg);

            const cobroMsg = { ...botMsgData, id: 'cobro-' + Date.now(), body: paymentMsg, content: paymentMsg };
            chat.messages.push(cobroMsg);
            saveChats(chats);
            io.emit('message', cobroMsg);
            scheduleRecovery(to);

            if (ADMIN_PHONE) {
                const notif = mode === 'auto' ? `🚀 *ENTREGA AUTO:* Envié *${deliveredSales.join(', ')}* a *${chat.customerName}* y realicé el cobro.` : `✅ *ENTREGA EXITOSA* a *${chat.customerName}*.`;
                sendMessageToCloudAPI(ADMIN_PHONE, notif);
            }
            return { success: true };
        } else {
            // MENSAJE DE ESPERA AL CLIENTE SI NO HAY STOCK
            const holdingMsg = `¡Listo! Dame un momento y te envío los datos de acceso para que los pruebes. Estoy preparando tu cuenta... 😊`;
            await sendMessageToCloudAPI(to, holdingMsg);
            
            const holdBotMsg = {
                id: 'hold-' + Date.now(), from: to, body: holdingMsg, content: holdingMsg,
                isMe: true, role: 'bot', timestampRaw: Date.now(),
                timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
            };
            chat.messages.push(holdBotMsg);
            saveChats(chats); io.emit('message', holdBotMsg);

            if (ADMIN_PHONE) sendMessageToCloudAPI(ADMIN_PHONE, `❌ *SIN STOCK* para entregar a *${chat.customerName}*. Repón inventario pronto.`);
            return { success: false, error: 'No stock' };
        }
    } catch (err) { console.error('Delivery logic error:', err); return { success: false, error: err.message }; }
    finally { chat.isAutoDelivering = false; }
}


// Helper global: detectar si ya se enviaron credenciales o se cobró en este chat
const credentialsSentInChat = (messages) => {
    if (!messages || !Array.isArray(messages)) return false;
    return messages.some(m => {
        const text = (m.body || m.content || '').toLowerCase();
        return text.includes('correo:') || text.includes('contraseña:') || 
               text.includes('clave:') || text.includes('nequi') || 
               text.includes('datos de acceso') || text.includes('puedes hacer el pago') || 
               text.includes('pago vía') || text.includes('comprobante') ||
               text.includes('gracias por tu compra');
    });
};

// --- WEBHOOK META ---
app.get('/webhook', (req, res) => {
    const challenge = req.query['hub.challenge'];
    if (req.query['hub.verify_token'] === VERIFY_TOKEN) res.status(200).send(challenge);
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
                const alreadyDelivered = target.tags?.includes('entregado') || credentialsSentInChat(target.messages);
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
                    await sendMessageToCloudAPI(target.from, confirmMsg);
                    const botMsg = { id: 'conf-'+Date.now(), from: target.from, body: confirmMsg, isMe: true, role: 'bot', timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }), timestampRaw: Date.now() };
                    target.messages.push({ ...botMsg, content: confirmMsg });
                    io.emit('message', botMsg);
                    sendMessageToCloudAPI(ADMIN_PHONE, `✅ PAGO CONFIRMADO de ${target.customerName}.`);
                    lastReceiptFrom = null;
                } else {
                    await executeDelivery(target.from, mode);
                    if (lastReceiptFrom === target.from) lastReceiptFrom = null;
                }
            } else {
                sendMessageToCloudAPI(ADMIN_PHONE, `ℹ️ Sin pendientes.`);
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
                        mediaUrl = `${BACKEND_URL}/uploads/${fileName}`;
                        
                        // GPT analysis if image
                        if (msg.type === 'image') {
                            analyzeReceipt(buffer).then(isReceipt => {
                                if (isReceipt) {
                                    lastReceiptFrom = from;
                                    if (ADMIN_PHONE) sendMessageToCloudAPI(ADMIN_PHONE, `📄 *COMPROBANTE RECIBIDO* de *${customerName}*. Responda con *r* para confirmar.`);
                                    if (!currentChat.tags?.includes('pago-pendiente')) {
                                        currentChat.tags = [...(currentChat.tags || []), 'pago-pendiente'];
                                        saveChats(chats); io.emit('tag_updated', { from, tags: currentChat.tags });
                                    }
                                }
                            });
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
                id: msg.id, from, 
                body: msgBody, content: msgBody, 
                imageUrl: (msg.type === 'image' || msg.type === 'sticker') 
                    ? (mediaUrl || (mediaId ? `${BACKEND_URL}/api/media/${mediaId}` : null)) 
                    : null,
                fileUrl: (msg.type === 'document' || msg.type === 'audio') 
                    ? (mediaUrl || (mediaId ? `${BACKEND_URL}/api/media/${mediaId}` : null)) 
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

            if (aiTimers[from]) clearTimeout(aiTimers[from]);
            
            // Verificación de si el bot está apagado para este chat específico
            if (currentChat.aiDisabled) {
                console.log(`ℹ️ [SISTEMA] IA desactivada para ${customerName}. Ignorando IA...`);
                res.sendStatus(200);
                return;
            }

            aiTimers[from] = setTimeout(async () => {
                const refreshedChat = chats[from];
                const lastUserMsg = refreshedChat.messages.filter(m => m.role === 'user').slice(-1)[0];
                if (!lastUserMsg) return;

                const msgBodyLower = (lastUserMsg.content || '').toLowerCase().trim();
                const isPricingInquiry = (/\?|qué val|que val|precio|costo|cuánto|cuanto|valor|promoción|promo|descuento/i.test(msgBodyLower));
                
                // Nueva protección: ¿El mensaje es SOLO el nombre de una plataforma?
                const platformNames = getPlatformNames();
                const isOnlyProductName = platformNames.includes(msgBodyLower) || platformNames.some(p => msgBodyLower === `quiere ${p}` || msgBodyLower === `quiero ${p}`);

                // Auto-confirmación
                const confirmWords = /^(si|sí|dale|ok|listo|recibido|proceder|hagale|hágale|de una|deuna|ready|mándala|mandala|pásala|pasala|manda|pasa|venda|véndame|activar|pruébala|pruebala|probar)$/i;
                const containsExplicitConfirmation = confirmWords.test(msgBodyLower);

                if (!isPricingInquiry && !isOnlyProductName && containsExplicitConfirmation) {
                    const offeredAt = refreshedChat.activationOfferedAt || 0;
                    const recoveredAt = refreshedChat.recoverySentAt || 0;
                    const alreadyDelivered = credentialsSentInChat(refreshedChat.messages);
                    if (!alreadyDelivered && (Date.now() - offeredAt < 1800000 || Date.now() - recoveredAt < 1800000)) {
                        await executeDelivery(from, 'auto');
                        delete aiTimers[from];
                        return;
                    }
                }

                // Detección de soporte (cliente existente con problema)
                const supportRegex = /no (puedo|me deja|funciona|entra|sirve|carga|abre)|error|caído|cayó|problema|garant[ií]a|devolu|reclam|queja|no (se ve|se puede|anda)|demasiadas|muchas personas|perfil.*(no|bloqueado)|pagué|pagado|ya pag/i;
                const isSupport = supportRegex.test(msgBodyLower);

                // Auto-etiquetado de soporte
                if (isSupport && !refreshedChat.tags?.includes('soporte')) {
                    refreshedChat.tags = [...(refreshedChat.tags || []), 'soporte'];
                    saveChats(chats);
                    io.emit('tag_updated', { from, tags: refreshedChat.tags });
                    console.log(`🏷️ [SOPORTE] Chat de ${customerName} etiquetado automáticamente.`);
                }
                
                // Intención de activación - Solo si NO es soporte y NO se han enviado credenciales
                const activateRegex = /^(activ(a|ar|ame|alo)|quiero prob(ar|arla)|déjame prob|me la activas|actívala|actívamela)$/i;
                if (!isSupport && !credentialsSentInChat(refreshedChat.messages) && activateRegex.test(msgBodyLower)) {
                    executeDelivery(from, 'auto').catch(e => console.error('Error:', e));
                    refreshedChat.activationNotifySent = true;
                    refreshedChat.activationOfferedAt = Date.now();
                }

                // Respuesta IA - Pasar contexto según la situación del chat
                const allMessages = refreshedChat.messages.slice(-15);
                if (isSupport) {
                    allMessages.push({ role: 'system', content: '⚠️ CONTEXTO: Este cliente tiene un PROBLEMA con su cuenta existente. NO intentes venderle nada. Ofrece SOPORTE técnico.' });
                } else if (credentialsSentInChat(refreshedChat.messages)) {
                    allMessages.push({ role: 'system', content: '✅ CONTEXTO: Ya se enviaron las credenciales de acceso a este cliente y se le hizo el cobro. Estás en la etapa de COBRO/CONFIRMACIÓN. Solo responde preguntas sobre el precio, el pago o el funcionamiento. NUNCA ofrezcas ni entregues otra cuenta.' });
                }
                const aiReply = await getAIResponse(msgBodyLower, allMessages);
                // SOLO permitir entrega automática si NO es una consulta de precio, NO es solo el nombre del producto, y el cliente CONFIRMÓ explícitamente.
                const canAutoDeliver = !isSupport && !isPricingInquiry && !isOnlyProductName && containsExplicitConfirmation && !credentialsSentInChat(refreshedChat.messages);
                
                const hasPurchaseIntent = canAutoDeliver && (/\[PAGO_PENDIENTE\]/i.test(aiReply) || /\[PRODUCTOS:.+\]/i.test(aiReply));
                const forceDelivery = canAutoDeliver && /\[ENTREGAR_AHORA\]/i.test(aiReply);

                if (hasPurchaseIntent) {
                    if (!refreshedChat.tags?.includes('pago-pendiente')) {
                        refreshedChat.tags = [...(refreshedChat.tags || []), 'pago-pendiente'];
                        const prodsMatch = aiReply.match(/\[PRODUCTOS:(.+?)\]/i);
                        const totalMatch = aiReply.match(/\[TOTAL:(\d+?)\]/i);
                        if (prodsMatch) refreshedChat.pendingProducts = prodsMatch[1].split(',').map(p => p.trim());
                        if (totalMatch) refreshedChat.pendingTotal = totalMatch[1];
                        saveChats(chats); io.emit('tag_updated', { from, tags: refreshedChat.tags });
                    }
                }

                if (forceDelivery) {
                    setTimeout(() => executeDelivery(from, 'auto'), 500);
                }

                const cleanReply = aiReply.replace(/\[PAGO_PENDIENTE\]|\[PRODUCTOS:.+?\]|\[TOTAL:\d+?\]|\[ENTREGAR_AHORA\]/gi, '').trim();
                await delay(1500);
                await sendMessageToCloudAPI(from, cleanReply);

                const botMsg = { id: 'bot-'+Date.now(), from, body: cleanReply, content: cleanReply, isMe: true, role: 'bot', timestampRaw: Date.now() };
                refreshedChat.messages.push(botMsg);
                saveChats(chats); io.emit('message', botMsg);
                scheduleRecovery(from);
                
                delete aiTimers[from];
            }, 8000); 
        }
    }
    res.sendStatus(200);
});

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

async function analyzeReceipt(buffer) {
    if (!openai) return false;
    try {
        const base64 = buffer.toString('base64');
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Cambiado a mini por rapidez y costo, soporta visión
            messages: [
                { role: "system", content: "Eres un experto en validar comprobantes de transferencia (Nequi, Bancolombia, etc). Responde 'COMPROBANTE_VALIDO' si ves un recibo de pago real, o 'OTRO' si es cualquier otra cosa." },
                { role: "user", content: [
                    { type: "text", text: "¿Es esto un comprobante de pago?" },
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}` } }
                ]}
            ]
        });
        return response.choices[0].message.content.includes('COMPROBANTE_VALIDO');
    } catch (err) { console.error('GPT Vision error:', err); return false; }
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

    socket.on('sync_settings', (data) => { settings = data; saveSettings(settings); });
    socket.on('sync_inventory', (data) => { inventory = data; saveInventory(inventory); socket.broadcast.emit('inventory_updated', inventory); });
    socket.on('sync_sales', (data) => { sales = data; saveSales(sales); socket.broadcast.emit('sales_updated', sales); });
    socket.on('sync_platforms', (data) => { platforms = data; savePlatforms(platforms); socket.broadcast.emit('platforms_updated', platforms); });
    socket.on('sync_providers', (data) => { providers = data; saveProviders(providers); socket.broadcast.emit('providers_updated', providers); });
    
    socket.on('toggle_ai', ({ chatId, disabled }) => {
        if (chats[chatId]) {
            chats[chatId].aiDisabled = disabled;
            saveChats(chats);
            io.emit('ai_state_updated', { chatId, disabled });
        }
    });

    socket.on('test_ai', async (data, callback) => callback(await getAIResponse(data.content, data.history)));
    socket.on('update_chat_tags', ({ chatId, tags }) => { if (chats[chatId]) { chats[chatId].tags = tags; saveChats(chats); io.emit('tag_updated', { from: chatId, tags }); } });
    socket.on('send_message', async ({ to, content }) => {
        if (/^r$/i.test(content.trim())) { await executeDelivery(to, 'deliver_first'); return; }
        await sendMessageToCloudAPI(to, content);
        const m = { id: 'man-'+Date.now(), from: to, body: content, content, isMe: true, role: 'bot', timestampRaw: Date.now() };
        if (!chats[to]) chats[to] = { from: to, customerName: 'Cliente', messages: [] };
        chats[to].messages.push(m); chats[to].updatedAt = Date.now(); 
        if (recoveryTimers[to]) clearTimeout(recoveryTimers[to]);
        saveChats(chats); io.emit('message', m);
        scheduleRecovery(to);
    });
});

async function sendMessageToCloudAPI(to, text) {
    if (!WHATSAPP_TOKEN || !PHONE_ID) return;
    try {
        await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } })
        });
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
        const inv = inventory.map(i => `${i.service} - $${i.price} (${i.uses})`).join(', ');
        
        // Memoria de compras pasadas
        const customerSales = sales.filter(s => s.customerId === history[0]?.from || s.customer === history[0]?.customerName);
        const purchaseHistory = customerSales.length > 0 
            ? `Historial del cliente: Ha comprado ${customerSales.map(s => s.service).join(', ')} antes.`
            : "Cliente nuevo (sin compras previas).";

        const comp = await activeOpenAI.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: `${settings.systemPrompt}\n\n${purchaseHistory}\n\nStock actual para entrega instantánea: ${inv}` },
                ...history.map(m => ({ role: m.role==='user'?'user':'assistant', content: m.content||m.body })),
                { role: "user", content: message }
            ]
        });
        return comp.choices[0].message.content;
    } catch (e) { 
        console.error('❌ OpenAI API Error:', e.message);
        return `⚠️ Error IA: ${e.message || 'Sin respuesta del cerebro'}`; 
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor CRM listo y escuchando en el puerto ${PORT}`);
});
