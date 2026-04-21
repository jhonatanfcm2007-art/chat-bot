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
app.use(express.static(path.join(__dirname, '../dist')));

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

let lastReceiptFrom = null; // Último cliente que envió comprobante

// --- PERSISTENCIA DEL INVENTARIO ---
const DATA_DIR = path.join(__dirname, 'data');
const INVENTORY_FILE = path.join(DATA_DIR, 'inventory.json');
const SALES_FILE = path.join(DATA_DIR, 'sales.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const PLATFORMS_FILE = path.join(DATA_DIR, 'platforms.json');
const PROVIDERS_FILE = path.join(DATA_DIR, 'providers.json');


// Crear carpeta data si no existe
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadInventory() {
    try {
        if (fs.existsSync(INVENTORY_FILE)) {
            const raw = fs.readFileSync(INVENTORY_FILE, 'utf-8');
            const parsed = JSON.parse(raw);
            console.log(`📦 Inventario cargado desde disco: ${parsed.length} productos.`);
            return parsed;
        }
    } catch (err) {
        console.error('❌ Error cargando inventario desde disco:', err.message);
    }
    return [];
}

function saveInventory(data) {
    try {
        fs.writeFileSync(INVENTORY_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`💾 Inventario guardado: ${data.length} productos.`);
    } catch (err) {
        console.error('❌ Error guardando inventario:', err.message);
    }
}

function loadSales() {
    try {
        if (fs.existsSync(SALES_FILE)) {
            const raw = fs.readFileSync(SALES_FILE, 'utf-8');
            const parsed = JSON.parse(raw);
            console.log(`📈 Historial de ventas cargado: ${parsed.length} registros.`);
            return parsed;
        }
    } catch (err) {
        console.error('❌ Error cargando ventas desde disco:', err.message);
    }
    return [];
}

function saveSales(data) {
    try {
        fs.writeFileSync(SALES_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`💾 Ventas guardadas: ${data.length} registros.`);
    } catch (err) {
        console.error('❌ Error guardando ventas:', err.message);
    }
}

function loadChats() {
    try {
        if (fs.existsSync(CHATS_FILE)) {
            const raw = fs.readFileSync(CHATS_FILE, 'utf-8');
            const data = JSON.parse(raw);
            
            // --- CURACIÓN DE DATOS (Healing) ---
            // Asegurar que todos los chats tengan updatedAt para el correcto ordenamiento
            Object.keys(data).forEach(id => {
                const chat = data[id];
                if (!chat.updatedAt) {
                    const messages = chat.messages || [];
                    const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
                    chat.updatedAt = lastMsg?.timestampRaw || 0;
                }
            });
            
            return data;
        }
    } catch (err) {
        console.error('❌ Error cargando chats:', err.message);
    }
    return {};
}

function saveChats(data) {
    try {
        fs.writeFileSync(CHATS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error('❌ Error guardando chats:', err.message);
    }
}

function loadSettings() {
    const defaultSettings = {
        systemPrompt: "Eres un asistente virtual de ventas para cuentas de streaming por WhatsApp. Sé cordial, breve, persuasivo y usa emojis.\n\n### ESTRATEGIA DE VENTA:\n1. Saluda e identifica qué producto busca el cliente.\n2. Ofrece los productos disponibles con sus precios del inventario.\n3. CONFIANZA: Si el cliente duda, tiene miedo de ser estafado, o pide garantía, ofrécele activar la cuenta primero para que la pruebe antes de pagar. Muchas personas han sido estafadas y esto genera confianza.\n4. Si el cliente acepta o pide que le activen primero, confirma que un agente procederá con la activación.\n5. Métodos de pago: Nequi, Daviplata o Bancolombia.\n\n### REGLAS TÉCNICAS:\n1. Al detectar intención de compra, añade SIEMPRE al final: [PRODUCTOS:Nombre1,Nombre2][TOTAL:Numero]. Ejemplo: [PRODUCTOS:Netflix,Disney+][TOTAL:25000].\n2. Si no puedes resolver algo, usa [REQUIERE_HUMANO].\n3. Nunca inventes precios, usa SOLO los del inventario.\n4. Sé breve, máximo 2-3 líneas por respuesta."
    };
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (err) {
        console.error('❌ Error cargando configuración IA:', err.message);
    }
    return defaultSettings;
}

function saveSettings(data) {
    try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error('❌ Error guardando configuración IA:', err.message);
    }
}

function loadPlatforms() {
    try {
        if (fs.existsSync(PLATFORMS_FILE)) {
            const raw = fs.readFileSync(PLATFORMS_FILE, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (err) {
        console.error('❌ Error cargando plataformas:', err.message);
    }
    return ['Netflix', 'Disney+', 'Prime Video', 'HBO Max', 'Paramount', 'Vix', 'Crunchyroll'];
}

function savePlatforms(data) {
    try {
        fs.writeFileSync(PLATFORMS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error('❌ Error guardando plataformas:', err.message);
    }
}

function loadProviders() {
    try {
        if (fs.existsSync(PROVIDERS_FILE)) {
            const raw = fs.readFileSync(PROVIDERS_FILE, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (err) {
        console.error('❌ Error cargando proveedores:', err.message);
    }
    return ['WebX', 'Proveedor Externo'];
}

function saveProviders(data) {
    try {
        fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error('❌ Error guardando proveedores:', err.message);
    }
}

// Cargar datos al iniciar el servidor
let inventory = loadInventory();
let sales = loadSales();
let chats = loadChats();
let settings = loadSettings();
let platforms = loadPlatforms();
let providers = loadProviders();

// Helper function for random delay
const delay = (ms) => new Promise(res => setTimeout(res, ms));

// --- WEBHOOK ENDPOINTS PARA META ---

// 1. Verificación del Webhook (GET)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// 2. Recepción de Mensajes (POST)
app.post('/webhook', async (req, res) => {
    console.log('📩 Webhook recibido de Meta:', JSON.stringify(req.body));
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        if (body.entry && 
            body.entry[0].changes && 
            body.entry[0].changes[0].value.messages && 
            body.entry[0].changes[0].value.messages[0]) {

            const msg = body.entry[0].changes[0].value.messages[0];
            const from = msg.from;
            
            // Extraer el nombre del cliente del payload (contactos) o usar el número si no está disponible
            const contacts = body.entry[0].changes[0].value.contacts;
            const customerName = contacts && contacts[0]?.profile?.name ? contacts[0].profile.name : from;

            // ========================
            // DETECCIÓN DE COMANDOS DEL ADMINISTRADOR DESDE SU WHATSAPP PERSONAL
            // Si el número que escribe es el dueño del negocio, tratar como comando.
            // ========================
            const commandRegex = /^r$/i;
            if (ADMIN_PHONE && from === ADMIN_PHONE && msg.type === 'text' && commandRegex.test(msg.text.body.trim())) {

                // --- ENCONTRAR EL CLIENTE OBJETIVO ---
                // Prioridad 1: lastReceiptFrom = quien envió un comprobante más recientemente (SIN IMPORTAR ETIQUETA)
                // Prioridad 2: Chats con pendingProducts (IA detectó productos)
                // Prioridad 3: Chat con etiqueta 'pago-pendiente'
                let targetChat = null;
                let mode = null; // 'confirm_payment' | 'deliver_and_paid' | 'deliver_first'

                // Prioridad 1: Último que envió comprobante
                if (lastReceiptFrom && chats[lastReceiptFrom] && lastReceiptFrom !== ADMIN_PHONE) {
                    const receiptChat = chats[lastReceiptFrom];
                    if (receiptChat.tags && receiptChat.tags.includes('entregado')) {
                        // Ya tiene credenciales, esto es confirmación de pago
                        targetChat = receiptChat;
                        mode = 'confirm_payment';
                    } else {
                        // No tiene credenciales aún, pago primero → entregar + marcar pagado
                        targetChat = receiptChat;
                        mode = 'deliver_and_paid';
                    }
                }

                // Prioridad 2: Chat con pendingProducts (si no hay lastReceiptFrom)
                if (!targetChat) {
                    const chatsWithProducts = Object.values(chats).filter(c =>
                        c.from !== ADMIN_PHONE && c.pendingProducts && c.pendingProducts.length > 0 &&
                        !(c.tags && c.tags.includes('entregado'))
                    ).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
                    if (chatsWithProducts.length > 0) {
                        targetChat = chatsWithProducts[0];
                        mode = 'deliver_first';
                    }
                }

                // Prioridad 3: Fallback por etiqueta pago-pendiente
                if (!targetChat) {
                    const taggedChats = Object.values(chats).filter(c =>
                        c.from !== ADMIN_PHONE && c.tags && c.tags.includes('pago-pendiente')
                    ).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
                    if (taggedChats.length > 0) {
                        targetChat = taggedChats[0];
                        mode = 'deliver_first';
                    }
                }

                if (targetChat) {
                    const targetFrom = targetChat.from;

                    // ========== MODE: CONFIRM PAYMENT ==========
                    if (mode === 'confirm_payment') {
                        targetChat.tags = (targetChat.tags || []).filter(t => t !== 'entregado' && t !== 'pago-pendiente');
                        if (!targetChat.tags.includes('pagado')) targetChat.tags.push('pagado');
                        targetChat.updatedAt = Date.now();

                        saveChats(chats);
                        io.emit('tag_updated', { from: targetFrom, tags: targetChat.tags });

                        const confirmMsg = '✅ *¡Pago confirmado!* Muchas gracias por tu compra, disfruta tu cuenta 🎉🙌';
                        await sendMessageToCloudAPI(targetFrom, confirmMsg);

                        const confirmBotMsg = {
                            id: 'confirm-' + Date.now(),
                            from: targetFrom,
                            customerName: 'Sistema',
                            body: confirmMsg,
                            timestamp: new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' }),
                            timestampRaw: Date.now(),
                            isMe: true,
                            role: 'bot'
                        };
                        targetChat.messages.push({ ...confirmBotMsg, content: confirmMsg });
                        saveChats(chats);
                        io.emit('message', confirmBotMsg);

                        await sendMessageToCloudAPI(ADMIN_PHONE, `✅ *PAGO CONFIRMADO* de *${targetChat.customerName}*.\nLa venta se marcó como pagada en el CRM.`);
                        if (lastReceiptFrom === targetFrom) lastReceiptFrom = null;

                        res.sendStatus(200);
                        return;
                    }

                    // --- DETECTAR PRODUCTOS si no están guardados ---
                    let productsToDeliver = targetChat.pendingProducts && targetChat.pendingProducts.length > 0
                        ? targetChat.pendingProducts
                        : null;

                    if (!productsToDeliver) {
                        // Inferir desde el historial reciente del chat
                        const recentMessages = (targetChat.messages || []).slice(-20);
                        const allText = recentMessages.map(m => (m.content || m.body || '')).join(' ').toLowerCase();
                        productsToDeliver = inventory
                            .filter(a => allText.includes(a.service.toLowerCase()))
                            .map(a => a.service)
                            .filter((v, i, arr) => arr.indexOf(v) === i); // únicos
                    }

                    if (!productsToDeliver || productsToDeliver.length === 0) {
                        await sendMessageToCloudAPI(ADMIN_PHONE, `⚠️ *No detecté productos:* Encontré al cliente *${targetChat.customerName}* pero no pude determinar qué cuenta entregar. Responde con el nombre exacto del producto (ej: "netflix ${targetFrom}") o usa el panel del CRM.`);
                        res.sendStatus(200);
                        return;
                    }

                    // --- ENTREGAR CUENTAS ---
                    let totalCredentialsMsg = `🚀 *¡Aquí tienes tus cuentas!*\n\n`;
                    let accountsFound = 0;
                    const deliveredSales = [];

                    for (const serviceName of productsToDeliver) {
                        const accIndex = inventory.findIndex(a =>
                            a.service.toLowerCase().includes(serviceName.toLowerCase()) &&
                            (a.status === 'Available' || parseInt(a.uses) > 0)
                        );
                        if (accIndex !== -1) {
                            const acc = inventory[accIndex];
                            const salePrice = targetChat.pendingTotal
                                ? Math.round(parseInt(targetChat.pendingTotal) / productsToDeliver.length)
                                : (parseFloat(acc.price) || 0);
                            const now = new Date();
                            const ref = `${(acc.service || 'SRV').replace(/[^a-zA-Z0-9]/g,'').toUpperCase().substring(0,4)}-${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
                            const newSale = {
                                id: 'auto-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                                reference: ref,
                                service: acc.service,
                                price: salePrice,
                                cost: parseFloat(acc.cost) || 0,
                                provider: acc.provider || 'N/A',
                                date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }),
                                customer: targetChat.customerName || 'Cliente',
                                customerId: targetFrom
                            };
                            sales.push(newSale);
                            deliveredSales.push(acc.service);
                            acc.uses = parseInt(acc.uses) - 1;
                            if (acc.uses <= 0) acc.status = 'Sold Out';
                            totalCredentialsMsg += `✅ *${acc.service}*\n📧 *Correo:* ${acc.email}\n🔑 *Clave:* ${acc.pass}${acc.profile ? '\n👤 *Perfil:* ' + acc.profile : ''}${acc.pin ? '\n📌 *PIN:* ' + acc.pin : ''}\n\n`;
                            accountsFound++;
                        }
                    }

                    if (accountsFound > 0) {
                        totalCredentialsMsg += `⚠️ *Importante:* No modificar la contraseña ni alterar otros perfiles para mantener tu garantía.\n\n¡Gracias por tu compra! 🎉`;
                        await sendMessageToCloudAPI(targetFrom, totalCredentialsMsg);

                        // Actualizar estado del chat según modo
                        targetChat.tags = (targetChat.tags || []).filter(t => t !== 'pago-pendiente');
                        if (mode === 'deliver_and_paid') {
                            if (!targetChat.tags.includes('pagado')) targetChat.tags.push('pagado');
                        } else {
                            // deliver_first: cuenta activada, esperando pago
                            targetChat.tags = targetChat.tags.filter(t => t !== 'pagado');
                            if (!targetChat.tags.includes('entregado')) targetChat.tags.push('entregado');
                        }
                        targetChat.pendingProducts = [];
                        targetChat.pendingTotal = null;
                        targetChat.updatedAt = Date.now(); // Mantener orden en la lista

                        // Persistir todo
                        saveSales(sales);
                        saveInventory(inventory);
                        saveChats(chats);

                        io.emit('sales_updated', sales);
                        io.emit('inventory_updated', inventory);
                        io.emit('tag_updated', { from: targetFrom, tags: targetChat.tags });

                        const botMsgData = {
                            id: 'auto-' + Date.now(),
                            from: targetFrom,
                            customerName: 'Sistema',
                            body: totalCredentialsMsg,
                            timestamp: new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' }),
                            timestampRaw: Date.now(),
                            isMe: true,
                            role: 'bot'
                        };
                        targetChat.messages.push({ ...botMsgData, content: totalCredentialsMsg });
                        saveChats(chats);
                        io.emit('message', botMsgData);

                        // Confirmar al admin según modo
                        if (mode === 'deliver_and_paid') {
                            await sendMessageToCloudAPI(ADMIN_PHONE, `✅ *ENTREGA EXITOSA* a *${targetChat.customerName}*:\n📦 Productos: ${deliveredSales.join(', ')}\n💰 Venta registrada y pagada.`);
                        } else {
                            await sendMessageToCloudAPI(ADMIN_PHONE, `📦 *CUENTA ACTIVADA* para *${targetChat.customerName}*:\n📦 Productos: ${deliveredSales.join(', ')}\n⏳ Esperando pago. Cuando envíe comprobante, responde *r* para confirmar.`);
                        }
                        if (lastReceiptFrom === targetFrom) lastReceiptFrom = null;
                    } else {
                        await sendMessageToCloudAPI(ADMIN_PHONE, `❌ *SIN STOCK:* Detecté los productos pero no hay cuentas disponibles para: *${productsToDeliver.join(', ')}*. Revisa el inventario en el CRM.`);
                    }
                } else {
                    await sendMessageToCloudAPI(ADMIN_PHONE, `ℹ️ *Sin pendientes:* No encontré ningún cliente esperando entrega ni confirmación de pago.`);
                }

                res.sendStatus(200);
                return;
            }
            // ========================
            // FIN DETECCIÓN ADMIN
            // ========================

            let msgBody = '';
            
            if (msg.type === 'image') {
                // --- ANÁLISIS DE IMAGEN CON GPT-4o VISION ---
                let isReceipt = false;
                let detectedAmount = null;

                try {
                    // 1. Obtener URL de descarga desde Meta
                    const mediaId = msg.image.id;
                    const mediaInfoRes = await fetch(`https://graph.facebook.com/v18.0/${mediaId}`, {
                        headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
                    });
                    const mediaInfo = await mediaInfoRes.json();
                    const mediaUrl = mediaInfo.url;

                    // 2. Descargar la imagen como buffer
                    const imageRes = await fetch(mediaUrl, {
                        headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` }
                    });
                    const imageBuffer = await imageRes.arrayBuffer();
                    const base64Image = Buffer.from(imageBuffer).toString('base64');
                    const mimeType = msg.image.mime_type || 'image/jpeg';

                    // 3. Enviar a GPT-4o para análisis
                    if (openai) {
                        const visionResponse = await openai.chat.completions.create({
                            model: 'gpt-4o',
                            max_tokens: 80,
                            messages: [{
                                role: 'user',
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Analiza esta imagen. ¿Es un comprobante de pago bancario, transferencia o Nequi/Daviplata? Responde EXACTAMENTE en este formato:\nRESULTADO: COMPROBANTE o NO_COMPROBANTE\nMONTO: (número entero sin puntos ni símbolos, o DESCONOCIDO)'
                                    },
                                    {
                                        type: 'image_url',
                                        image_url: { url: `data:${mimeType};base64,${base64Image}` }
                                    }
                                ]
                            }]
                        });

                        const visionText = visionResponse.choices[0].message.content || '';
                        console.log('🔍 Análisis de imagen GPT-4o:', visionText);

                        isReceipt = visionText.includes('COMPROBANTE') && !visionText.includes('NO_COMPROBANTE');
                        const montoMatch = visionText.match(/MONTO:\s*(\d+)/);
                        if (montoMatch) detectedAmount = parseInt(montoMatch[1]);
                    }
                } catch (imgErr) {
                    console.error('❌ Error analizando imagen con GPT-4o:', imgErr.message);
                    isReceipt = true;
                }

                if (isReceipt) {
                    lastReceiptFrom = from;
                    msgBody = '[IMAGEN RECIBIDA] EL CLIENTE ACABA DE ENVIAR UN COMPROBANTE FOTOGRÁFICO.';
                    io.emit('receipt_received', { from, customerName, message: msgBody });

                    // Notificación simple al admin: cliente + monto detectado
                    if (ADMIN_PHONE) {
                        const montoText = detectedAmount ? `$${detectedAmount.toLocaleString('es-CO')}` : 'No visible en la imagen';
                        const chatData = chats[from];
                        const isEntregado = chatData && chatData.tags && chatData.tags.includes('entregado');

                        if (isEntregado) {
                            sendMessageToCloudAPI(ADMIN_PHONE, `💰 *COMPROBANTE DE PAGO* (cuenta ya entregada)\n\n👤 *Cliente:* ${customerName}\n💵 *Monto:* ${montoText}\n\nResponde *r* para confirmar el pago.`);
                        } else {
                            sendMessageToCloudAPI(ADMIN_PHONE, `🔔 *COMPROBANTE DETECTADO* (verificado por IA)\n\n👤 *Cliente:* ${customerName}\n💰 *Monto en imagen:* ${montoText}\n\nResponde *r* para entregar automáticamente.`);
                        }
                    }
                } else {
                    // No es comprobante: la IA le pide el comprobante real al cliente
                    msgBody = '[IMAGEN NO VÁLIDA] El cliente envió una imagen que NO es un comprobante de pago bancario o transferencia. Indícale amablemente que esa imagen no es un comprobante válido y pídele que envíe el comprobante de pago real (captura de Nequi, Bancolombia, Daviplata, etc.) para proceder con la entrega de su cuenta.';
                    console.log('🖼️ Imagen analizada: NO es comprobante de pago. Pidiendo comprobante real.');
                }
            } else if (msg.type === 'text') {
                msgBody = msg.text.body;
            } else {
                msgBody = `[MENSAJE FORMATO ESPECIAL (${msg.type})]: Revisa los logs del sistema, podría ser el código de Meta. Contenido: ${JSON.stringify(msg)}`;
            }

            if (msgBody) {
                const messageData = {
                    id: msg.id,
                    from: from,
                    customerName: customerName,
                    body: msgBody,
                    timestamp: new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' }),
                    timestampRaw: Date.now(),
                    isMe: false,
                    role: 'user'
                };

                // Persistir mensaje del cliente
                if (!chats[from]) chats[from] = { from, customerName, messages: [] };
                chats[from].recoveryMessageSent = false; // Reset recovery flag on new client message
                
                const history = chats[from].messages.slice(-10); // Tomar solo los últimos 10 para ahorrar tokens de ChatGPT
                chats[from].messages.push({ ...messageData, content: msgBody });
                chats[from].updatedAt = Date.now();
                saveChats(chats);

                io.emit('message', messageData);

                // Procesar con IA
                let aiReply = await getAIResponse(msgBody, history);
                let requiresHuman = false;

                // 1. Detección de Soporte Humano
                const humanRegex = /\[?(REQUIERE_HUMANO|REQUIERE HUMANO|INTERVENCION HUMANA)\]?/i;
                if (humanRegex.test(aiReply)) {
                    requiresHuman = true;
                    aiReply = aiReply.replace(humanRegex, '').trim();

                    io.emit('human_required', { from, customerName, message: msgBody });

                    // Notificar al dueño por WhatsApp personal si requiere humano
                    if (ADMIN_PHONE) {
                        sendMessageToCloudAPI(ADMIN_PHONE, `👨‍💻 *INTERVENCIÓN REQUERIDA:* El cliente *${customerName}* (${from}) solicita o requiere atención humana. Mensaje: "${msgBody}"`);
                    }
                }

                // 2. Detección de Pago Pendiente (Venta realizada pero sin confirmar)
                const pagoRegex = /\[?(PAGO_PENDIENTE|PAGO PENDIENTE)\]?/i;
                const productosRegex = /\[PRODUCTOS:(.+?)\]/i;
                const totalRegex = /\[TOTAL:(\d+?)\]/i;

                if (pagoRegex.test(aiReply) || productosRegex.test(aiReply)) {
                    chats[from].tags = chats[from].tags || [];
                    if (!chats[from].tags.includes('pago-pendiente')) {
                        chats[from].tags.push('pago-pendiente');
                    }

                    // Extraer productos y total detectados por la IA
                    const prodMatch = aiReply.match(productosRegex);
                    const totalMatch = aiReply.match(totalRegex);
                    
                    if (prodMatch) {
                        chats[from].pendingProducts = prodMatch[1].split(',').map(p => p.trim());
                        aiReply = aiReply.replace(productosRegex, '').trim();
                    }
                    if (totalMatch) {
                        chats[from].pendingTotal = totalMatch[1];
                        aiReply = aiReply.replace(totalRegex, '').trim();
                    }

                    saveChats(chats);
                    io.emit('tag_updated', { from, tags: chats[from].tags });
                    aiReply = aiReply.replace(pagoRegex, '').trim();
                }
                
                await delay(2000);

                await sendMessageToCloudAPI(from, aiReply);

                const botMsgData = {
                    id: 'bot-' + Date.now(),
                    from: from,
                    customerName: 'Bot',
                    body: aiReply,
                    timestamp: new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' }),
                    timestampRaw: Date.now(),
                    isMe: true,
                    role: 'bot',
                    requiresHuman
                };

                // Persistir respuesta del bot
                chats[from].messages.push({ ...botMsgData, content: aiReply });
                chats[from].updatedAt = Date.now();
                chats[from].lastBotReplyAt = Date.now(); // Track for recovery timer
                saveChats(chats);

                io.emit('message', botMsgData);
            }
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// --- API REST PARA INVENTARIO (persistente) ---

app.get('/api/inventory', (req, res) => {
    res.json(inventory);
});

app.post('/api/inventory', (req, res) => {
    const newInventory = req.body;
    if (!Array.isArray(newInventory)) {
        return res.status(400).json({ error: 'Se esperaba un array de productos.' });
    }
    inventory = newInventory;
    saveInventory(inventory);
    io.emit('inventory_updated', inventory);
    res.json({ success: true, count: inventory.length });
});

// --- API REST PARA VENTAS ---

app.get('/api/sales', (req, res) => {
    res.json(sales);
});

app.post('/api/sales', (req, res) => {
    const newSales = req.body;
    if (!Array.isArray(newSales)) {
        return res.status(400).json({ error: 'Se esperaba un array de ventas.' });
    }
    sales = newSales;
    saveSales(sales);
    io.emit('sales_updated', sales);
    res.json({ success: true, count: sales.length });
});

// --- API REST PARA PLATAFORMAS ---

app.get('/api/platforms', (req, res) => {
    res.json(platforms);
});

app.post('/api/platforms', (req, res) => {
    const data = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Array expected' });
    platforms = data;
    savePlatforms(platforms);
    io.emit('platforms_updated', platforms);
    res.json({ success: true });
});

// --- API REST PARA PROVEEDORES ---

app.get('/api/providers', (req, res) => {
    res.json(providers);
});

app.post('/api/providers', (req, res) => {
    const data = req.body;
    if (!Array.isArray(data)) return res.status(400).json({ error: 'Array expected' });
    providers = data;
    saveProviders(providers);
    io.emit('providers_updated', providers);
    res.json({ success: true });
});

// --- FUNCIONES DE WHATSAPP Y IA ---

async function sendMessageToCloudAPI(to, text) {
    if (!WHATSAPP_TOKEN || !PHONE_ID) {
        console.error('❌ Falta configuración de WhatsApp en .env');
        return;
    }

    try {
        const response = await fetch(`https://graph.facebook.com/v20.0/${PHONE_ID}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: to,
                type: "text",
                text: { body: text }
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('❌ Error enviando a Meta:', data);
        } else {
            console.log('✅ Mensaje enviado a Meta exitosamente');
        }
    } catch (err) {
        console.error('❌ Error de red al contactar Meta:', err);
    }
}

async function getAIResponse(message, history = []) {
    if (!openai) return "Modo IA desactivado. Configura tu API Key de OpenAI en el archivo .env.";
    
    try {
        const inventoryContext = inventory.length > 0
            ? "El inventario actual es: " + inventory.map(item => `${item.service} - $${item.price} (${item.uses} disponibles)`).join(', ')
            : "Actualmente no hay inventario cargado.";

        const strictRule = "REGLA OBLIGATORIA: Si el cliente pide soporte explícitamente, necesita hacer un pago que requiera confirmación humana, o hace una pregunta que no puedes resolver, incluye la palabra secreta '[REQUIERE_HUMANO]' en tu respuesta.";
        
        const formattedHistory = history.map(msg => ({
            role: (msg.role === 'bot' || msg.isMe) ? 'assistant' : 'user',
            content: msg.content || msg.body
        }));

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: `${settings.systemPrompt}\n\n${strictRule}\n\nBasate en esta información de inventario para responder: ${inventoryContext}` },
                ...formattedHistory,
                { role: "user", content: message }
            ]
        });
        return completion.choices[0].message.content;
    } catch (error) {
        console.error("Error al comunicarse con la IA de OpenAI:", error);
        return "Disculpa, no puedo procesar tu respuesta en este momento debido a un problema técnico.";
    }
}

// --- WEBSOCKET ---

io.on('connection', (socket) => {
    console.log('A client connected');
    
    const status = (WHATSAPP_TOKEN && PHONE_ID) ? 'CONNECTED' : 'DISCONNECTED';
    socket.emit('status', status);

    // Enviar datos actuales al cliente que se conecta
    socket.emit('inventory_updated', inventory);
    socket.emit('sales_updated', sales);
    socket.emit('initial_chats', chats);
    socket.emit('initial_settings', settings);
    socket.emit('platforms_updated', platforms);
    socket.emit('providers_updated', providers);

    // Configuración de la IA
    socket.on('sync_settings', (data) => {
        settings = data;
        saveSettings(settings);
    });

    // Test de la IA
    socket.on('test_ai', async (data, callback) => {
        const reply = await getAIResponse(data.content, data.history || []);
        callback(reply);
    });

    // Actualización manual de Etiquetas del chat
    socket.on('update_chat_tags', ({ chatId, tags }) => {
        if (chats[chatId]) {
            chats[chatId].tags = tags;
            saveChats(chats);
            io.emit('tag_updated', { from: chatId, tags });
        }
    });

    // Mantener compatibilidad con el evento sync_inventory del frontend
    socket.on('sync_inventory', (data) => {
        inventory = data;
        saveInventory(inventory);
        io.emit('inventory_updated', inventory);
    });

    socket.on('sync_sales', (data) => {
        sales = data;
        saveSales(sales);
        io.emit('sales_updated', sales);
    });

    socket.on('sync_platforms', (data) => {
        platforms = data;
        savePlatforms(platforms);
        io.emit('platforms_updated', platforms);
    });

    socket.on('sync_providers', (data) => {
        providers = data;
        saveProviders(providers);
        io.emit('providers_updated', providers);
    });

    socket.on('send_message', async ({ to, content }) => {
        try {
            const commandRegex = /^r$/i;
            const isCommand = commandRegex.test(content.trim());

            if (isCommand) {
                const chat = chats[to];
                if (chat && chat.pendingProducts && chat.pendingProducts.length > 0) {
                    let totalCredentialsMsg = "🚀 *AUTOMACIÓN:* Aquí tienes tus cuentas:\n\n";
                    let accountsFound = 0;
                    
                    for (const serviceName of chat.pendingProducts) {
                        // Buscar cuenta disponible para este servicio
                        const accIndex = inventory.findIndex(a => 
                            a.service.toLowerCase().includes(serviceName.toLowerCase()) && 
                            (a.status === 'Available' || parseInt(a.uses) > 0)
                        );

                        if (accIndex !== -1) {
                            const acc = inventory[accIndex];
                            
                            // 1. Registrar Venta
                            const salePrice = chat.pendingTotal 
                                ? Math.round(parseInt(chat.pendingTotal) / (chat.pendingProducts?.length || 1))
                                : (parseFloat(acc.price) || 0);
                            const now2 = new Date();
                            const ref2 = `${(acc.service || 'SRV').replace(/[^a-zA-Z0-9]/g,'').toUpperCase().substring(0,4)}-${String(now2.getDate()).padStart(2,'0')}${String(now2.getMonth()+1).padStart(2,'0')}-${String(now2.getHours()).padStart(2,'0')}${String(now2.getMinutes()).padStart(2,'0')}`;
                            const saleId = 'crm-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                            const newSale = {
                                id: saleId,
                                reference: ref2,
                                service: acc.service,
                                price: salePrice,
                                cost: parseFloat(acc.cost) || 0,
                                provider: acc.provider || 'N/A',
                                date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }),
                                customer: chat.customerName || 'Cliente',
                                customerId: to
                            };
                            sales.push(newSale);
                            
                            // 2. Descontar Inventario
                            acc.uses = parseInt(acc.uses) - 1;
                            if (acc.uses <= 0) acc.status = 'Sold Out';

                            // 3. Formatear Credenciales
                            totalCredentialsMsg += `✅ *${acc.service}*\n📧 *Correo:* ${acc.email}\n🔑 *Clave:* ${acc.pass}${acc.profile ? '\n👤 *Perfil:* ' + acc.profile : ''}${acc.pin ? '\n📌 *PIN:* ' + acc.pin : ''}\n\n`;
                            accountsFound++;
                        }
                    }

                    if (accountsFound > 0) {
                        totalCredentialsMsg += "⚠️ *Importante:* No modificar datos de la cuenta para mantener tu garantía.\n\n¡Gracias por tu compra! 🎉";
                        
                        // Enviar el mensaje consolidado a WhatsApp
                        await sendMessageToCloudAPI(to, totalCredentialsMsg);
                        
                        // Actualizar estado del chat (desde CRM = entregado, esperando pago)
                        chat.tags = (chat.tags || []).filter(t => t !== 'pago-pendiente');
                        chat.tags = chat.tags.filter(t => t !== 'pagado');
                        if (!chat.tags.includes('entregado')) chat.tags.push('entregado');
                        chat.pendingProducts = []; // Limpiar pendientes
                        chat.pendingTotal = null;
                        chat.updatedAt = Date.now(); // Mantener orden en la lista

                        // Persistir todo
                        saveSales(sales);
                        saveInventory(inventory);
                        saveChats(chats);

                        // Notificar al frontend
                        io.emit('sales_updated', sales);
                        io.emit('inventory_updated', inventory);
                        io.emit('tag_updated', { from: to, tags: chat.tags });
                        
                        // Agregar el mensaje de entrega al historial visual
                        const botMsgData = {
                            id: 'auto-' + Date.now(),
                            from: to,
                            customerName: 'Sistema',
                            body: totalCredentialsMsg,
                            timestamp: new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' }),
                            timestampRaw: Date.now(),
                            isMe: true,
                            role: 'bot'
                        };
                        chat.messages.push({ ...botMsgData, content: totalCredentialsMsg });
                        io.emit('message', botMsgData);
                        return; // Terminar aquí para no enviar el "(r)" como mensaje
                    } else {
                        // Si no encontró ninguna cuenta
                        await sendMessageToCloudAPI(to, "❌ Hubo un inconveniente buscando tus cuentas disponibles. Un agente humano revisará esto ahora mismo.");
                    }
                }
            }

            // Flujo normal si no es comando o no hay pendientes
            await sendMessageToCloudAPI(to, content);
            const msgData = {
                id: 'man-' + Date.now(),
                from: to,
                customerName: 'Yo',
                body: content,
                timestamp: new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' }),
                timestampRaw: Date.now(),
                isMe: true,
                role: 'bot'
            };

            if (!chats[to]) chats[to] = { from: to, customerName: 'Cliente', messages: [] };
            chats[to].messages.push({ ...msgData, content });
            chats[to].updatedAt = Date.now();
            saveChats(chats);

            io.emit('message', msgData);
        } catch (err) {
            console.error('Error in send_message processing:', err);
        }
    });
});

app.get('/privacy', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Política de Privacidad - Chatbot Antigravity</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; line-height: 1.8; }
        h1 { color: #1a1a2e; border-bottom: 3px solid #6c63ff; padding-bottom: 10px; }
        h2 { color: #6c63ff; margin-top: 30px; }
    </style>
</head>
<body>
    <h1>Política de Privacidad</h1>
    <p><strong>Última actualización:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
    
    <h2>1. Información que recopilamos</h2>
    <p>Recopilamos únicamente la información necesaria para brindar nuestro servicio de atención al cliente vía WhatsApp: nombre de perfil, número de teléfono y mensajes enviados.</p>
    
    <h2>2. Uso de la información</h2>
    <p>La información recopilada se utiliza exclusivamente para responder consultas de los usuarios a través de WhatsApp y mejorar nuestro servicio de atención automatizada.</p>
    
    <h2>3. Almacenamiento y seguridad</h2>
    <p>Los datos se almacenan de forma segura en servidores protegidos. No compartimos, vendemos ni transferimos información personal a terceros.</p>
    
    <h2>4. Derechos del usuario</h2>
    <p>Los usuarios pueden solicitar la eliminación de sus datos en cualquier momento contactándonos directamente.</p>
    
    <h2>5. Servicios de terceros</h2>
    <p>Utilizamos la API de WhatsApp Business (Meta) y OpenAI para procesar mensajes. Estos servicios tienen sus propias políticas de privacidad.</p>
    
    <h2>6. Contacto</h2>
    <p>Para consultas sobre privacidad, contáctenos a través de nuestro número de WhatsApp Business.</p>
</body>
</html>`);
});

app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// --- RECOVERY TIMER: Follow-up after 3 minutes of client silence ---
const RECOVERY_DELAY = 3 * 60 * 1000; // 3 minutes

setInterval(() => {
    const now = Date.now();
    Object.values(chats).forEach(async (chat) => {
        if (!chat.from || chat.from === ADMIN_PHONE) return;
        if (chat.recoveryMessageSent) return;
        if (!chat.lastBotReplyAt) return;

        // Only for chats with detected products (pago-pendiente)
        const hasPending = chat.tags && chat.tags.includes('pago-pendiente');
        if (!hasPending) return;

        const timeSinceBot = now - chat.lastBotReplyAt;
        if (timeSinceBot < RECOVERY_DELAY) return;

        // Check if client responded after bot's last reply
        const clientMessages = (chat.messages || []).filter(m => m.role === 'user');
        const lastClientMsg = clientMessages.length > 0 ? clientMessages[clientMessages.length - 1] : null;
        const lastClientTime = lastClientMsg?.timestampRaw || 0;

        if (lastClientTime > chat.lastBotReplyAt) return; // Client already responded

        // Send recovery message
        const recoveryMsg = 'Hola! 😊 Si estás interesado/a te la puedo activar primero para que la pruebes y te asegures que todo funciona bien antes de pagar 💯✅';

        try {
            await sendMessageToCloudAPI(chat.from, recoveryMsg);
            chat.recoveryMessageSent = true;

            const botMsgData = {
                id: 'recovery-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                from: chat.from,
                customerName: 'Bot',
                body: recoveryMsg,
                timestamp: new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' }),
                timestampRaw: Date.now(),
                isMe: true,
                role: 'bot'
            };
            chat.messages.push({ ...botMsgData, content: recoveryMsg });
            chat.updatedAt = Date.now();
            chat.lastBotReplyAt = Date.now();
            saveChats(chats);
            io.emit('message', botMsgData);
            console.log(`🔄 Recovery message sent to ${chat.customerName} (${chat.from})`);
        } catch (err) {
            console.error(`❌ Error sending recovery to ${chat.from}:`, err.message);
        }
    });
}, 30000); // Check every 30 seconds

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Meta Bot Server listening on port ${PORT}`);
    console.log(`📦 Inventario: ${inventory.length} | 📈 Ventas: ${sales.length}`);
});
