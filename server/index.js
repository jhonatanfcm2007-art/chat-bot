const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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

const openai = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('YOUR_OPENAI_API_KEY') 
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

// Configuración de Meta desde .env
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ADMIN_PHONE = process.env.ADMIN_PHONE;

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
        systemPrompt: "Eres un asistente virtual de ventas para cuentas de streaming por WhatsApp. Sé cordial, breve, persuasivo y usa emojis.\n\n### ESTRATEGIA DE VENTA:\n1. Saluda e identifica qué producto busca el cliente.\n2. OFERTA TOTAL: Aunque no veas stock en el inventario actual, OFRECE SIEMPRE todas las plataformas (Netflix, Disney+, HBO, Prime Video, YouTube Premium, etc.). NO te limites solo a lo que hay en el inventario.\n3. Si el cliente pide algo que no está en el catálogo de inventario, dile que \"tenemos cupos disponibles\" o \"la estamos preparando\" para asegurar la venta.\n4. CONFIANZA: Si el cliente duda o pide garantía, ofrécele activar la cuenta primero para que la pruebe antes de pagar. Esto genera mucha confianza.\n5. Si el cliente confirma interés en probarla o menciona el producto tras tu oferta, añade SIEMPRE la etiqueta [ENTREGAR_AHORA] al final de tu respuesta para que el sistema le envíe las credenciales de inmediato.\n\n### REGLAS SOBRE PAGOS Y COMPROBANTES:\n- Si el cliente ya recibió la cuenta para probarla y dice que va a pagar o que ya pagó, dile: \"¡Perfecto! Quedo atento al comprobante de pago (pantallazo) para validar tu garantía y registrar tu compra.\"\n- NUNCA digas \"Gracias por tu compra\" o \"Disfruta tu cuenta\" de forma definitiva hasta que el cliente envíe el comprobante de pago.\n\n### REGLAS TÉCNICAS:\n1. Al detectar intención de compra, añade SIEMPRE: [PRODUCTOS:Nombre1,Nombre2][TOTAL:Numero].\n2. Si el cliente acepta la activación previa o pregunta 'cuánto demora' tras la oferta, añade obligatoriamente: [ENTREGAR_AHORA].\n3. Métodos de pago: Nequi, Daviplata o Bancolombia.\n4. Sé breve, máximo 2-3 líneas por respuesta."
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

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const recoveryTimers = {};

function scheduleRecovery(to) {
    if (recoveryTimers[to]) clearTimeout(recoveryTimers[to]);
    
    const chat = chats[to];
    if (!chat) return;

    // Solo clientes nuevos (sin etiquetas de compra)
    const isNewClient = !(chat.tags || []).some(t => t === 'pagado' || t === 'entregado');
    if (!isNewClient) return;

    recoveryTimers[to] = setTimeout(async () => {
        const c = chats[to];
        if (!c) return;
        const stillNew = !(c.tags || []).some(t => t === 'pagado' || t === 'entregado');
        const lastMsg = c.messages[c.messages.length - 1];
        const isBotLast = lastMsg && (lastMsg.role === 'bot' || lastMsg.isMe);

        if (stillNew && isBotLast && !c.recoverySentAt) {
            // Verificación extra: no enviar si ya existe en el historial completo de mensajes
            const alreadySent = c.messages.some(m => m.body?.includes("activar primero") || m.content?.includes("activar primero"));
            if (alreadySent) {
                c.recoverySentAt = Date.now(); // Marcamos para no volver a evaluar
                saveChats(chats);
                return;
            }

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
                    customer: chat.customerName, customerId: to
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
                mode = target.tags?.includes('entregado') ? 'confirm_payment' : 'deliver_and_paid';
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
        let msgBody = msg.type === 'text' ? msg.text.body : (msg.type === 'image' ? '[IMAGEN]' : '');

        if (msgBody) {
            if (!chats[from]) chats[from] = { from, customerName, messages: [] };
            const currentChat = chats[from];
            
            let imageUrl = null;
            if (msg.type === 'image') {
                const mediaId = msg.image.id;
                console.log(`📸 Imagen recibida de ${customerName}. Descargando...`);
                const buffer = await downloadMetaMedia(mediaId);
                if (buffer) {
                    const fileName = `${Date.now()}-${from}.jpg`;
                    const filePath = path.join(UPLOADS_DIR, fileName);
                    fs.writeFileSync(filePath, buffer);
                    imageUrl = `/uploads/${fileName}`;
                    
                    analyzeReceipt(buffer).then(isReceipt => {
                        if (isReceipt) {
                            lastReceiptFrom = from;
                            if (ADMIN_PHONE) sendMessageToCloudAPI(ADMIN_PHONE, `📄 *COMPROBANTE RECIBIDO* de *${customerName}*. Responde con *r* para confirmar el pago.`);
                            if (!currentChat.tags?.includes('pago-pendiente')) {
                                currentChat.tags = [...(currentChat.tags || []), 'pago-pendiente'];
                                saveChats(chats); io.emit('tag_updated', { from, tags: currentChat.tags });
                            }
                        }
                    });
                }
            }

            const newMessage = { id: msg.id, from, body: msgBody, content: msgBody, imageUrl, timestampRaw: Date.now(), role: 'user' };
            
            // --- MANEJO DE AUDIO (Voice to Text) ---
            if (msg.type === 'audio') {
                const mediaId = msg.audio.id;
                console.log(`🎙️ Audio recibido de ${customerName}. Transcribiendo...`);
                const buffer = await downloadMetaMedia(mediaId);
                if (buffer) {
                    const tempAudioPath = path.join(UPLOADS_DIR, `temp-${Date.now()}-${from}.ogg`);
                    fs.writeFileSync(tempAudioPath, buffer);
                    try {
                        const transcription = await openai.audio.transcriptions.create({
                            file: fs.createReadStream(tempAudioPath),
                            model: "whisper-1",
                        });
                        msgBody = transcription.text;
                        newMessage.body = `🎙️ (Audio): ${msgBody}`;
                        newMessage.content = newMessage.body;
                        console.log(`📝 Transcripción: ${msgBody}`);
                    } catch (e) { console.error('Whisper error:', e); }
                    if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
                }
            }

            currentChat.messages.push(newMessage);
            currentChat.updatedAt = Date.now();
            if (recoveryTimers[from]) clearTimeout(recoveryTimers[from]);
            saveChats(chats); io.emit('message', { ...newMessage, customerName });

            if (aiTimers[from]) clearTimeout(aiTimers[from]);
            aiTimers[from] = setTimeout(async () => {
                const refreshedChat = chats[from];
                const lastUserMsg = refreshedChat.messages.filter(m => m.role === 'user').slice(-1)[0];
                if (!lastUserMsg) return;

                const msgBodyLower = (lastUserMsg.content || '').toLowerCase().trim();

                // Auto-confirmación
                const confirmWords = /^(si|sí|dale|ok|vale|hagale|hágale|de una|deuna|listo|ready|cuanto|cuánto|demora|demoras|esperando|mándala|mandala|pásala|pasala|manda|pasa)$/i;
                if (confirmWords.test(msgBodyLower)) {
                    const offeredAt = refreshedChat.activationOfferedAt || 0;
                    const recoveredAt = refreshedChat.recoverySentAt || 0;
                    if (Date.now() - offeredAt < 1800000 || Date.now() - recoveredAt < 1800000) {
                        await executeDelivery(from, 'auto');
                        delete aiTimers[from];
                        return;
                    }
                }

                // Intención de activación
                const activateRegex = /activ(a|ar|ame|alo|o\s+primer|ala\s+primer|e\s+primer)|primer[ao]|antes\s+de\s+pagar|pru[eé]b(a|ala|alo|as)/i;
                if (activateRegex.test(msgBodyLower)) {
                    executeDelivery(from, 'auto').catch(e => console.error('Error:', e));
                    refreshedChat.activationNotifySent = true;
                    refreshedChat.activationOfferedAt = Date.now();
                }

                // Respuesta IA
                const aiReply = await getAIResponse(msgBodyLower, refreshedChat.messages.slice(-15));
                const hasPurchaseIntent = /\[PAGO_PENDIENTE\]/i.test(aiReply) || /\[PRODUCTOS:.+\]/i.test(aiReply);
                const forceDelivery = /\[ENTREGAR_AHORA\]/i.test(aiReply);

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
            }, 5000); 
        }
    }
    res.sendStatus(200);
});

async function downloadMetaMedia(mediaId) {
    try {
        const response = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
            headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
        });
        const data = await response.json();
        if (!data.url) return null;
        
        const mediaRes = await fetch(data.url, {
            headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
        });
        return Buffer.from(await mediaRes.arrayBuffer());
    } catch (err) { console.error('Media download error:', err); return null; }
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
    if (!openai) return "Error IA";
    try {
        const inv = inventory.map(i => `${i.service} - $${i.price} (${i.uses})`).join(', ');
        
        // Memoria de compras pasadas
        const customerSales = sales.filter(s => s.customerId === history[0]?.from || s.customer === history[0]?.customerName);
        const purchaseHistory = customerSales.length > 0 
            ? `Historial del cliente: Ha comprado ${customerSales.map(s => s.service).join(', ')} antes.`
            : "Cliente nuevo (sin compras previas).";

        const comp = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: `${settings.systemPrompt}\n\n${purchaseHistory}\n\nStock actual para entrega instantánea: ${inv}` },
                ...history.map(m => ({ role: m.role==='user'?'user':'assistant', content: m.content||m.body })),
                { role: "user", content: message }
            ]
        });
        return comp.choices[0].message.content;
    } catch (e) { return "Error técnico"; }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor CRM listo y escuchando en el puerto ${PORT}`);
});
