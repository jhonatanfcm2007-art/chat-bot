import dotenv from 'dotenv';
dotenv.config(); 

import express from 'express';
import webpush from 'web-push';
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// Configuración Línea 2 de WhatsApp (Multi-Línea)
const WHATSAPP_TOKEN_2 = process.env.WHATSAPP_TOKEN_2;
const PHONE_ID_2 = process.env.WHATSAPP_PHONE_ID_2;

// Configuración Messenger
const MESSENGER_PAGE_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
const MESSENGER_VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN || VERIFY_TOKEN;

console.log('--- [SISTEMA] Diagnóstico de Variables ---');
console.log('OpenAI Key:', process.env.OPENAI_API_KEY ? `Detectada (${process.env.OPENAI_API_KEY.substring(0, 10)}...)` : '❌ FALTANTE');
console.log('📱 Línea 1 - WhatsApp Token:', WHATSAPP_TOKEN ? '✅ Detectado' : '❌ FALTANTE');
console.log('📱 Línea 1 - Phone ID:', PHONE_ID ? `✅ ${PHONE_ID}` : '❌ FALTANTE');
console.log('📱 Línea 2 - WhatsApp Token:', WHATSAPP_TOKEN_2 ? '✅ Detectado' : '⚠️ No configurada');
console.log('📱 Línea 2 - Phone ID:', PHONE_ID_2 ? `✅ ${PHONE_ID_2}` : '⚠️ No configurada');
console.log('Admin Phone:', ADMIN_PHONE ? `✅ Detectado (${ADMIN_PHONE})` : '❌ FALTANTE');

// URL pública del backend (Railway la provee automáticamente)
const BACKEND_URL = process.env.RAILWAY_PUBLIC_DOMAIN 
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` 
    : (process.env.BACKEND_URL || '');
console.log('Backend URL:', BACKEND_URL || '⚠️ No configurada (usando rutas relativas)');
console.log('-----------------------------------------');

app.get('/api/health', async (req, res) => {
    res.json({ status: 'ok' });
});

// Endpoint secreto para depurar webhooks de Meta
app.get('/api/webhook-debug', (req, res) => {
    res.json(webhookLogs);
});

// Helper Multi-Línea: Resuelve credenciales según la línea del cliente
function getWhatsAppCredentials(customerPhone) {
    const chat = chats?.[customerPhone];
    if (chat?.waLine === 2 && WHATSAPP_TOKEN_2 && PHONE_ID_2) {
        return { token: WHATSAPP_TOKEN_2, phoneId: PHONE_ID_2, line: 2 };
    }
    return { token: WHATSAPP_TOKEN, phoneId: PHONE_ID, line: 1 };
}

let lastReceiptFrom = null; 
const aiTimers = {};
const webhookLogs = []; // Stores last 20 webhooks for debugging

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

// --- CONFIGURACIÓN DE NOTIFICACIONES PUSH ---
const VAPID_FILE = path.join(DATA_DIR, 'vapid.json');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'push_subscriptions.json');

let vapidKeys;
if (fs.existsSync(VAPID_FILE)) {
    try {
        vapidKeys = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf-8'));
        console.log('🔑 [PUSH] Llaves VAPID cargadas con éxito.');
    } catch (e) {
        console.error('❌ [PUSH] Error leyendo vapid.json, regenerando...', e);
    }
}

if (!vapidKeys) {
    vapidKeys = webpush.generateVAPIDKeys();
    try {
        fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2));
        console.log('🔑 [PUSH] Nuevas llaves VAPID generadas y guardadas.');
    } catch (e) {
        console.error('❌ [PUSH] No se pudieron guardar las llaves VAPID:', e);
    }
}

// Configurar web-push
webpush.setVapidDetails(
    'mailto:soporte@streamingcrm.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

function loadPushSubscriptions() {
    try {
        if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
            return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8'));
        }
    } catch (err) {
        console.error('Error loading push subscriptions:', err);
    }
    return [];
}

function savePushSubscriptions(subs) {
    try {
        fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2));
    } catch (err) {
        console.error('Error saving push subscriptions:', err);
    }
}

let pushSubscriptions = loadPushSubscriptions();

async function sendPushNotification(title, body, url = '/') {
    if (pushSubscriptions.length === 0) return;
    
    const payload = JSON.stringify({
        title,
        body,
        icon: '/app_icon.png',
        badge: '/app_icon.png',
        url
    });
    
    console.log(`📡 [PUSH] Enviando notificación push a ${pushSubscriptions.length} dispositivos...`);
    
    const sendPromises = pushSubscriptions.map(async (subscription) => {
        try {
            await webpush.sendNotification(subscription, payload);
        } catch (error) {
            console.error('❌ [PUSH] Error enviando a suscripción:', error.endpoint, error.statusCode);
            if (error.statusCode === 410 || error.statusCode === 404) {
                pushSubscriptions = pushSubscriptions.filter(sub => sub.endpoint !== subscription.endpoint);
                savePushSubscriptions(pushSubscriptions);
                console.log(`📡 [PUSH] Suscripción expirada eliminada. Restantes: ${pushSubscriptions.length}`);
            }
        }
    });
    
    await Promise.all(sendPromises);
}

app.use('/uploads', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    next();
}, express.static(UPLOADS_DIR));

// Servir archivos estáticos del frontend en producción
const DIST_DIR = path.join(__dirname, '../dist');
if (fs.existsSync(DIST_DIR)) {
    console.log('✅ [SISTEMA] Sirviendo archivos estáticos del frontend desde:', DIST_DIR);
    app.use(express.static(DIST_DIR));
} else {
    app.get('/', (req, res) => res.send('Backend Chatbot CRM running 🚀'));
}

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
    const defSingle = { 
        systemPrompt: "Eres el asesor comercial virtual oficial de ventas de Shilajit 100% Puro Resina en Colombia por WhatsApp. Eres directo, amable, altamente persuasivo y muy eficiente. Usa emojis con moderación.\n\n### INFORMACIÓN DEL PRODUCTO (SHILAJIT):\n- ¿Qué es?: Es una sustancia natural y milenaria recolectada en las alturas del Himalaya, rica en ácido fúlvico y más de 84 minerales biodisponibles.\n- Beneficios principales: Aumenta la energía y resistencia física, potencia el rendimiento masculino, combate la fatiga y el cansancio, eleva la vitalidad y apoya los niveles naturales de testosterona.\n- Modo de uso: Tomar una pequeña porción del tamaño de un grano de arroz (incluye cuchara dosificadora) disuelta en agua tibia, té, café o leche caliente una o dos veces al día.\n\n### REGLA INQUEBRANTABLE - MÉTODOS DE PAGO Y ENVÍO:\n- ÚNICAMENTE se maneja PAGO CONTRAENTREGA en toda Colombia.\n- El envío es GRATIS a nivel nacional.\n- El cliente paga en efectivo únicamente cuando recibe el producto en la puerta de su casa o trabajo.\n- NUNCA solicites pagos por anticipado ni giros antes de recibir.\n\n### ESTRATEGIA DE VENTA Y CIERRE:\n1. **COTIZACIÓN**: Si preguntan precios, presenta los precios y promociones de forma atractiva resaltando el ahorro en los combos.\n   - 1 Tarro (30g): $89.000 COP\n   - Combo 2 Tarros: $149.000 COP (Ahorra $29.000)\n   - Combo 3 Tarros: $199.000 COP (Máximo Ahorro)\n2. **TOMA DE DATOS PARA DESPACHO (¡MUY IMPORTANTE!)**: Cuando el cliente confirme que quiere pedir (ej: \"quiero uno\", \"envíamelo\", \"quiero el combo 2x\", \"listo\", \"dale\", \"pedir\"), solicítale amablemente los 5 datos necesarios para programar su envío Pago Contraentrega:\n   - 👤 Nombre completo\n   - 📞 Número de celular\n   - 📍 Ciudad y Departamento\n   - 🏠 Dirección exacta y Barrio\n   - 🛒 Producto o Combo elegido\n3. **REGISTRO DE PEDIDO**: Cuando el cliente te entregue sus datos de despacho completos, TU RESPUESTA DEBE INCLUIR ESTAS ETIQUETAS (y nada más):\n   [ENTREGAR_AHORA]\n   [PRODUCTOS: NombreDelProducto]\n   Ejemplo perfecto: \"¡Excelente decisión! Ya he registrado tu pedido. En breve coordinamos el despacho. [ENTREGAR_AHORA] [PRODUCTOS: Shilajit 100% Puro Resina 30g]\"\n\n### SOPORTE Y ASESORÍA:\n- Si el cliente reporta una novedad de entrega o pregunta por su número de guía, usa [APAGAR_BOT_SOPORTE] para que un humano lo atienda.",
        welcomeAudioEnabled: false,
        welcomeAudioUrl: '',
        welcomeImageEnabled: false,
        welcomeImageUrl: ''
    };
    
    const def = { "1": { ...defSingle }, "2": { ...defSingle } };
    
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
            // Migración: si el JSON antiguo no tiene "1", asumimos que es el formato viejo plano
            if (!data["1"]) {
                return { "1": { ...defSingle, ...data }, "2": { ...defSingle } };
            }
            return { 
                "1": { ...defSingle, ...(data["1"] || {}) }, 
                "2": { ...defSingle, ...(data["2"] || {}) } 
            };
        }
    } catch (err) { console.error('Error loading settings:', err); }
    return def;
}
function saveSettings(data) { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2)); }

function loadPlatforms() {
    try {
        if (fs.existsSync(PLATFORMS_FILE)) return JSON.parse(fs.readFileSync(PLATFORMS_FILE, 'utf-8'));
    } catch (err) {}
    return ['Shilajit Resina', 'Combos Promocionales'];
}
function savePlatforms(data) { fs.writeFileSync(PLATFORMS_FILE, JSON.stringify(data, null, 2)); }

function loadProviders() {
    try {
        if (fs.existsSync(PROVIDERS_FILE)) return JSON.parse(fs.readFileSync(PROVIDERS_FILE, 'utf-8'));
    } catch (err) {}
    return ['Himalaya Natural', 'Laboratorio Oficial'];
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

// CONFIGURACIÓN DE PROMPTS POR LÍNEA (solo se aplica si el prompt está vacío o es el default viejo)
(function initLinePrompts() {
    const shilajitPrompt = `Eres el asesor comercial virtual oficial de Shilajit Ultra en Cápsulas en Guatemala por WhatsApp. Eres un vendedor estrella: súper amigable, directo, conversacional y ALTAMENTE PERSUASIVO.

### 🎯 REGLAS INQUEBRANTABLES DE CONVERSIÓN Y VENTAS EN WHATSAPP:
1. **MENSAJES CORTOS Y DIRECTOS (MÁXIMO 2 O 3 LÍNEAS POR MENSAJE)**: NUNCA envíes textos largos ni sermones.
2. **SIEMPRE TERMINA CON UNA PREGUNTA DE CIERRE O CONVERSACIÓN**: Jamás dejes una respuesta en punto muerto.
3. **PAGO CONTRA ENTREGA Y ENVÍO GRATIS**: Recalca siempre: ENVÍO GRATIS y PAGO CONTRA ENTREGA en toda Guatemala.

### 🇬🇹 PRECIOS EN QUETZALES (Q):
- 🌿 1 Frasco (60 Cápsulas): Q155 (Envío GRATIS + Pago Contra Entrega)
- 🎁 Combo 2 Frascos (120 Cápsulas): Q244 (Ahorras Q66 - ¡El Más Vendido!)
- 🔥 Combo 3 Frascos (180 Cápsulas): Q330 (¡Máximo Ahorro!)

### PRODUCTO:
Shilajit Ultra en Cápsulas - Potenciador 100% natural. Beneficios: más energía, mejor rendimiento físico y sexual, fortalece sistema inmune, eleva testosterona natural.

### 🛒 REGISTRO DE PEDIDOS:
Cuando el cliente pida o entregue sus datos de despacho completos, responde brevemente e incluye las etiquetas: [ENTREGAR_AHORA] [PRODUCTOS: NombreDelProducto].`;

    const rodilleraPrompt = `Eres el asesor comercial virtual oficial de la Rodillera Térmica en Guatemala por WhatsApp. Eres un vendedor estrella: súper amigable, directo, conversacional y ALTAMENTE PERSUASIVO.

### 🎯 REGLAS INQUEBRANTABLES DE CONVERSIÓN Y VENTAS EN WHATSAPP:
1. **MENSAJES CORTOS Y DIRECTOS (MÁXIMO 2 O 3 LÍNEAS POR MENSAJE)**: NUNCA envíes textos largos ni sermones.
2. **SIEMPRE TERMINA CON UNA PREGUNTA DE CIERRE O CONVERSACIÓN**: Jamás dejes una respuesta en punto muerto.
3. **PAGO CONTRA ENTREGA Y ENVÍO GRATIS**: Recalca siempre: ENVÍO GRATIS y PAGO CONTRA ENTREGA en toda Guatemala.

### PRODUCTO - RODILLERA TÉRMICA:
- Rodillera térmica de compresión con soporte articular avanzado.
- Alivia el dolor de rodilla, artritis, inflamación y molestias por desgaste.
- Tecnología de calor terapéutico que mejora la circulación y reduce la rigidez.
- Material transpirable, cómodo para uso diario.
- Ideal para personas con dolor crónico de rodillas, adultos mayores, deportistas y personas que pasan mucho tiempo de pie.

### BENEFICIOS CLAVE:
✅ Alivio inmediato del dolor de rodilla
✅ Soporte y estabilidad articular
✅ Calor terapéutico que reduce inflamación
✅ Cómoda para usar todo el día
✅ Sin medicamentos, sin efectos secundarios

### 🇬🇹 PRECIOS EN QUETZALES (Q):
- 🦵 1 Rodillera Térmica: Q149 (Envío GRATIS + Pago Contra Entrega)
- 🎁 Combo 2 Rodilleras (ambas rodillas): Q249 (¡El Más Vendido! Ahorras Q49)
- 🔥 Combo 3 Rodilleras (para toda la familia): Q329 (¡Máximo Ahorro!)

### 🛒 REGISTRO DE PEDIDOS:
Cuando el cliente pida o entregue sus datos de despacho completos, responde brevemente e incluye las etiquetas: [ENTREGAR_AHORA] [PRODUCTOS: Rodillera Térmica].`;

    // Solo actualizar si el prompt actual contiene "Shilajit" en línea 2 (migración de producto incorrecto)
    if (!settings["2"].systemPrompt || settings["2"].systemPrompt.includes('Shilajit')) {
        settings["2"].systemPrompt = rodilleraPrompt;
        console.log('🔄 [CONFIG] Línea 2 configurada para Rodillera Térmica.');
    }
    // Solo actualizar línea 1 si está vacía
    if (!settings["1"].systemPrompt || settings["1"].systemPrompt.length < 50) {
        settings["1"].systemPrompt = shilajitPrompt;
        console.log('🔄 [CONFIG] Línea 1 configurada para Shilajit Ultra.');
    }
    saveSettings(settings);
    console.log('✅ [CONFIG] Prompts por línea inicializados correctamente.');
})();

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

const getPlatformNames = () => platforms.map(p => p.toLowerCase());

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const recoveryTimers = {};
const paymentReminderTimers = {};

function scheduleRecovery(to) {
    if (recoveryTimers[to]) clearTimeout(recoveryTimers[to]);
    const chat = chats[to];
    if (!chat || chat.aiDisabled) return;

    // Verificar si el último mensaje del bot fue la Etapa 5 (contiene la pregunta de cierre o precios)
    const lastBotMsg = [...(chat.messages || [])].reverse().find(m => m.role === 'bot');
    if (lastBotMsg && (lastBotMsg.content.includes("¿Con cuál te gustaría empezar?") || lastBotMsg.content.includes("Q155"))) {
        
        // Temporizador de 2.5 horas (2.5 * 60 * 60 * 1000 = 9000000 ms)
        const delayMs = 9000000;
        
        recoveryTimers[to] = setTimeout(async () => {
            const currentChat = chats[to];
            if (!currentChat || currentChat.aiDisabled) return;

            // Verificar nuevamente que el cliente no haya respondido (el último mensaje sigue siendo el nuestro)
            const newLastMsg = [...(currentChat.messages || [])].reverse()[0];
            if (newLastMsg && newLastMsg.role === 'bot') {
                console.log(`⏱️ [SEGUIMIENTO] Enviando seguimiento de Etapa 5 a ${currentChat.customerName} (${to})`);
                const followUpMsg = "Hola de nuevo 👋 Solo quería confirmarte que aún tenemos stock disponible hoy. Muchos clientes en Guatemala ya están sintiendo los resultados — no quiero que te quedes sin tu pedido. ¿Te ayudo a coordinar el envío?";
                
                const wamid = await smartSendMessage(to, followUpMsg);
                const botMsg = { 
                    id: wamid || ('bot-'+Date.now()), 
                    wamid: wamid || null, 
                    status: 'sent', 
                    from: to, 
                    body: followUpMsg, 
                    content: followUpMsg, 
                    isMe: true, 
                    role: 'bot', 
                    timestampRaw: Date.now() 
                };
                currentChat.messages.push(botMsg);
                saveChats(chats);
                io.emit('message', { ...botMsg, waLine: currentChat.waLine });
                
                // Limpiar el temporizador
                delete recoveryTimers[to];
            }
        }, delayMs);
    }
}

// Timer de cobro automático (Deshabilitado para Pago Contraentrega)
function schedulePaymentReminder(to) {
    return;
}

// --- REGISTRO DE PEDIDO (E-COMMERCE SIMPLE) ---
async function registerOrder(to, products, aiReplyText) {
    const chat = chats[to];
    if (!chat) return;

    const productList = products || 'Producto solicitado';
    const now = new Date();
    const ref = `PED-${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}-${Math.floor(Math.random()*1000)}`;
    
    // Registrar la venta
    sales.push({
        id: 'sale-' + Date.now(),
        reference: ref,
        service: productList,
        price: 0,
        date: now.toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' }),
        customer: chat.customerName,
        customerId: to,
        paid: false
    });
    saveSales(sales);
    io.emit('sales_updated', sales);

    // Marcar el pedido en el chat
    if (!chat.tags?.includes('pedido')) {
        chat.tags = [...(chat.tags || []).filter(t => t !== 'soporte'), 'pedido'];
    }
    chat.orderRegistered = true;
    chat.updatedAt = Date.now();
    saveChats(chats);
    io.emit('tag_updated', { from: to, tags: chat.tags });

    // Notificar al admin por WhatsApp
    if (ADMIN_PHONE) {
        const lastUserMsgs = (chat.messages || [])
            .filter(m => m.role === 'user')
            .slice(-5)
            .map(m => m.content || m.body)
            .join('\n');
        
        const notif = `📦 *NUEVO PEDIDO*\n👤 *Cliente:* ${chat.customerName}\n📞 *Chat:* ${to}\n🛒 *Producto:* ${productList}\n\n📋 *Datos del cliente:*\n${lastUserMsgs}`;
        smartSendMessage(ADMIN_PHONE, notif);
    }

    console.log(`📦 [PEDIDO] Nuevo pedido de ${chat.customerName}: ${productList}`);
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
    
    // Debug logger
    webhookLogs.unshift({ time: new Date().toISOString(), body });
    if (webhookLogs.length > 20) webhookLogs.pop();
    
    if (body.object === 'whatsapp_business_account' && body.entry?.[0].changes?.[0].value?.statuses?.[0]) {
        const statusObj = body.entry[0].changes[0].value.statuses[0];
        const originalRecipientId = statusObj.recipient_id;
        const webhookPhoneId = body.entry[0].changes[0].value.metadata?.phone_number_id;
        const waLine = webhookPhoneId === PHONE_ID_2 ? 2 : 1;
        const recipientId = waLine === 2 ? `${originalRecipientId}_2` : originalRecipientId;
        const newStatus = statusObj.status; // 'sent', 'delivered', 'read'
        const messageId = statusObj.id;

        if (recipientId && chats[recipientId]) {
            const currentChat = chats[recipientId];
            let messageFound = false;
            currentChat.messages.forEach(m => {
                if (m.wamid === messageId || m.id === messageId || (m.isMe || m.role === 'bot')) {
                    m.status = newStatus;
                    messageFound = true;
                }
            });
            if (messageFound) {
                saveChats(chats);
                io.emit('message_status_updated', { from: recipientId, messageId, status: newStatus });
            }
        }
        res.sendStatus(200);
        return;
    }

    if (body.object === 'whatsapp_business_account' && body.entry?.[0].changes?.[0].value.messages?.[0]) {
        const msg = body.entry[0].changes[0].value.messages[0];
        const originalFrom = msg.from;
        const webhookPhoneId = body.entry[0].changes[0].value.metadata?.phone_number_id;
        const waLine = webhookPhoneId === PHONE_ID_2 ? 2 : 1;
        const from = waLine === 2 ? `${originalFrom}_2` : originalFrom;
        
        // Descarte de mensajes reales para bloqueo estricto (WhatsApp)
        if (chats[from]?.isBlocked) {
            console.log(`🔒 [BLOQUEO] Mensaje entrante de WhatsApp ${from} descartado porque el contacto está bloqueado.`);
            res.sendStatus(200);
            return;
        }

        const contacts = body.entry[0].changes[0].value.contacts;
        const customerName = contacts?.[0]?.profile?.name || from;

        // Comandos Admin
        // El comando 'r' para entrega manual de credenciales ha sido eliminado.

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
            const isNewChat = !chats[from];
            if (!chats[from]) chats[from] = { from, customerName, messages: [] };
            const currentChat = chats[from];

            // Multi-Línea: Detectar de qué número de WhatsApp viene el mensaje
            const webhookPhoneId = body.entry[0].changes[0].value.metadata?.phone_number_id;
            if (webhookPhoneId === PHONE_ID_2) {
                currentChat.waLine = 2;
            } else if (!currentChat.waLine) {
                currentChat.waLine = 1;
            }

            triggerWelcomeAudioIfNeeded(from, isNewChat);
            triggerWelcomeImageIfNeeded(from, isNewChat);
            
            // Descarga de Multimedia
            if (['image', 'sticker', 'document', 'audio'].includes(msg.type)) {
                const mediaData = msg[msg.type];
                const mediaId = mediaData.id;
                console.log(`📥 ${msg.type.toUpperCase()} recibido de ${customerName}. Descargando...`);
                
                try {
                    const buffer = await downloadMetaMedia(mediaId, from);
                    if (buffer) {
                        const ext = msg.type === 'document' ? (msg.document.filename?.split('.').pop() || 'file') : (msg.type === 'image' ? 'jpg' : (msg.type === 'sticker' ? 'webp' : 'ogg'));
                        const fileName = `${Date.now()}-${from}.${ext}`;
                        const filePath = path.join(UPLOADS_DIR, fileName);
                        fs.writeFileSync(filePath, buffer);
                        mediaUrl = `/uploads/${fileName}`;
                        
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

                                    // Confirmar pago sin entregar cuentas (E-commerce simple)
                                    currentChat.tags = (currentChat.tags || []).filter(t => t !== 'pago-pendiente');
                                    if (!currentChat.tags.includes('pagado')) {
                                        currentChat.tags.push('pagado');
                                    }
                                    currentChat.updatedAt = Date.now();
                                    
                                    // Sincronizar estado de ventas a pagado
                                    const customerSales = sales.filter(s => s.customerId === from && !s.paid);
                                    if (customerSales.length > 0) {
                                        customerSales.forEach(s => s.paid = true);
                                        saveSales(sales);
                                        io.emit('sales_updated', sales);
                                    }

                                    const confirmMsg = '✅ *¡Pago verificado!* Muchas gracias por tu compra. 🎉';
                                    await smartSendMessage(from, confirmMsg);
                                    const botMsg = { id: 'conf-'+Date.now(), from, body: confirmMsg, isMe: true, role: 'bot', timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }), timestampRaw: Date.now() };
                                    currentChat.messages.push({ ...botMsg, content: confirmMsg });
                                    io.emit('message', botMsg);

                                    if (ADMIN_PHONE) {
                                        await smartSendMessage(ADMIN_PHONE, `✅ *PAGO DETECTADO* de *${customerName}* (${from}). Venta marcada como pagada.`);
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
                fileUrl: (msg.type === 'document' || msg.type === 'audio') 
                    ? (mediaUrl || (mediaId ? `/api/media/${mediaId}` : null)) 
                    : null,
                timestampRaw: Date.now(), role: 'user' 
            };
            
            // --- MANEJO DE AUDIO (Whisper) ---
            if (msg.type === 'audio' && newMessage.fileUrl) {
                const fileName = path.basename(newMessage.fileUrl);
                const filePath = path.join(UPLOADS_DIR, fileName);
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
            saveChats(chats); io.emit('message', { ...newMessage, customerName, waLine: currentChat.waLine });

            // Enviar notificación Push flotante al celular
            sendPushNotification(
                `${customerName} (WhatsApp)`,
                newMessage.body || 'Nuevo mensaje recibido',
                '/'
            ).catch(err => console.error('Error sending push notification:', err));

            handleIncomingMessage(from);
        }
    }
    res.sendStatus(200);
});

// Función centralizada para procesar la IA y lógica de negocio
async function processAIResponse(from, msgBodyLower) {
    const refreshedChat = chats[from];
    const customerName = refreshedChat.customerName;

    // Detección de soporte (cliente con problema real)
    const supportRegex = /no (puedo|me deja|funciona|entra|sirve|carga|abre)|error|caído|cayó|problema|garant[ií]a|devolu|reclam|queja/i;
    const isSupport = supportRegex.test(msgBodyLower);

    if (isSupport) {
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
        saveChats(chats); io.emit('message', { ...botMsg, waLine: refreshedChat.waLine });

        if (ADMIN_PHONE) smartSendMessage(ADMIN_PHONE, `⚠️ *SOPORTE REQUERIDO* por *${customerName}*. La IA se ha apagado para este chat.`);
        
        delete aiTimers[from];
        return;
    }

    // Respuesta IA
    const allMessages = refreshedChat.messages.slice(-15);
    
    // Contexto de pedido registrado
    if (refreshedChat.orderRegistered) {
        allMessages.push({ role: 'system', content: 'CONTEXTO: Este cliente ya tiene un pedido registrado. Si pregunta por su pedido, dile que ya está en proceso. Si quiere pedir algo más, toma el nuevo pedido normalmente.' });
    }
    
    // Pasar información de análisis de imagen si existe
    if (refreshedChat.lastImageAnalysis) {
        allMessages.push({ role: 'system', content: `CONTEXTO VISUAL: La última imagen enviada por el usuario fue analizada como: "${refreshedChat.lastImageAnalysis}".` });
        delete refreshedChat.lastImageAnalysis;
        saveChats(chats);
    }

    const aiReply = await getAIResponse(msgBodyLower, allMessages, refreshedChat.waLine);
    
    // --- APAGADO POR IA ---
    if (/\[APAGAR_BOT_SOPORTE\]/i.test(aiReply)) {
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
        saveChats(chats); io.emit('message', { ...botMsg, waLine: refreshedChat.waLine });

        if (ADMIN_PHONE) smartSendMessage(ADMIN_PHONE, `⚠️ *SOPORTE REQUERIDO* por *${customerName}* (Detectado por IA). La IA se ha apagado.`);
        
        delete aiTimers[from];
        return;
    }

    // --- REGISTRO DE PEDIDO ---
    const hasOrderTag = /\[ENTREGAR_AHORA\]/i.test(aiReply);
    const prodsMatch = aiReply.match(/\[PRODUCTOS:(.+?)\]/i);
    
    if (hasOrderTag && prodsMatch) {
        const products = prodsMatch[1].trim();
        await registerOrder(from, products);
    }

    // Limpiar etiquetas internas antes de enviar al cliente
    const cleanReply = aiReply.replace(/\[PAGO_PENDIENTE\]|\[PRODUCTOS:.+?\]|\[TOTAL:\d+?\]|\[ENTREGAR_AHORA\]|\[APAGAR_BOT_SOPORTE\]/gi, '').trim();
    
    await delay(1500);
    if (cleanReply) {
        const wamid = await smartSendMessage(from, cleanReply);
        const botMsg = { id: wamid || ('bot-'+Date.now()), wamid: wamid || null, status: 'sent', from, body: cleanReply, content: cleanReply, isMe: true, role: 'bot', timestampRaw: Date.now() };
        refreshedChat.messages.push(botMsg);
        saveChats(chats); io.emit('message', { ...botMsg, waLine: refreshedChat.waLine });
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

            // Descarte de mensajes reales para bloqueo estricto (Messenger)
            if (chats[sender_psid]?.isBlocked) {
                console.log(`🔒 [BLOQUEO] Mensaje entrante de Messenger ${sender_psid} descartado porque el contacto está bloqueado.`);
                return;
            }

            if (webhook_event.message && webhook_event.message.text) {
                const msgBody = webhook_event.message.text;
                
                const isNewChat = !chats[sender_psid];
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

                triggerWelcomeAudioIfNeeded(sender_psid, isNewChat);

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

                // Enviar notificación Push flotante al celular
                sendPushNotification(
                    `${currentChat.customerName} (Messenger)`,
                    newMessage.body || 'Nuevo mensaje recibido',
                    '/'
                ).catch(err => console.error('Error sending push notification:', err));

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
    if (currentChat.isBlocked) {
        console.log(`ℹ️ [SISTEMA] Mensaje entrante de ${from} ignorado porque el contacto está bloqueado.`);
        return;
    }
    if (currentChat.aiDisabled) return;

    aiTimers[from] = setTimeout(async () => {
        const refreshedChat = chats[from];
        
        // Evitar que la IA responda si el último mensaje ya es del bot/sistema
        const messages = refreshedChat.messages || [];
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if ((lastMsg.role === 'bot' || lastMsg.isMe) && !lastMsg.isWelcomeAudio && !lastMsg.isWelcomeImage) {
                console.log(`ℹ️ [SISTEMA] Ignorando respuesta de IA para ${refreshedChat.customerName} porque el último mensaje ya es del bot.`);
                delete aiTimers[from];
                return;
            }
        }

        const lastUserMsg = refreshedChat.messages.filter(m => m.role === 'user').slice(-1)[0];
        if (!lastUserMsg) return;

        const msgBodyLower = (lastUserMsg.content || '').toLowerCase().trim();

        processAIResponse(from, msgBodyLower);
    }, 2500);
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

async function smartSendAudio(to, audioUrl, origin) {
    const chat = chats[to];
    const platform = chat?.platform || 'whatsapp';
    
    const baseUrl = origin || BACKEND_URL || '';
    const fullAudioUrl = audioUrl.startsWith('http') 
        ? audioUrl 
        : `${baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl}${audioUrl.startsWith('/') ? audioUrl : '/' + audioUrl}`;

    if (platform === 'messenger') {
        return sendAudioToMessengerAPI(to, fullAudioUrl);
    } else {
        return sendAudioToCloudAPI(to, fullAudioUrl);
    }
}

function triggerWelcomeAudioIfNeeded(from, isNewChat, origin) {
    const chat = chats[from];
    const waLine = chat?.waLine || 1;
    const lineSettings = settings[waLine] || settings["1"];

    if (isNewChat && lineSettings.welcomeAudioEnabled && lineSettings.welcomeAudioUrl) {
        const audioUrl = lineSettings.welcomeAudioUrl;
        console.log(`🎙️ [BIENVENIDA] Enviando audio a ${from} (${audioUrl})`);
        
        setTimeout(async () => {
            try {
                await smartSendAudio(from, audioUrl, origin);
                const currentChat = chats[from];
                if (currentChat) {
                    const audioMsg = {
                        id: 'welcome-audio-' + Date.now(),
                        from,
                        body: '🎙️ [Audio de Bienvenida]',
                        content: '🎙️ [Audio de Bienvenida]',
                        fileUrl: audioUrl,
                        isMe: true,
                        role: 'bot',
                        isWelcomeAudio: true,
                        timestampRaw: Date.now(),
                        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                    };
                    currentChat.messages.push(audioMsg);
                    saveChats(chats);
                    io.emit('message', { ...audioMsg, waLine: currentChat.waLine });
                }
            } catch (err) {
                console.error('❌ [BIENVENIDA] Error enviando audio:', err);
            }
        }, 1500);
    }
}

function triggerWelcomeImageIfNeeded(from, isNewChat, origin) {
    const chat = chats[from];
    const waLine = chat?.waLine || 1;
    const lineSettings = settings[waLine] || settings["1"];

    if (isNewChat && lineSettings.welcomeImageEnabled && lineSettings.welcomeImageUrl) {
        const imageUrl = lineSettings.welcomeImageUrl;
        console.log(`🖼️ [BIENVENIDA] Enviando imagen de producto original a ${from} (${imageUrl})`);
        
        setTimeout(async () => {
            try {
                await smartSendImage(from, imageUrl, '✨ Producto 100% Original Garantizado con Sello de Autenticidad 🌿', origin);
                const currentChat = chats[from];
                if (currentChat) {
                    const imageMsg = {
                        id: 'welcome-image-' + Date.now(),
                        from,
                        body: '🖼️ [Foto de Producto Original]',
                        content: '🖼️ [Foto de Producto Original]',
                        imageUrl: imageUrl,
                        isMe: true,
                        role: 'bot',
                        isWelcomeImage: true,
                        timestampRaw: Date.now(),
                        timestamp: new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
                    };
                    currentChat.messages.push(imageMsg);
                    saveChats(chats);
                    io.emit('message', { ...imageMsg, waLine: currentChat.waLine });
                }
            } catch (err) {
                console.error('❌ [BIENVENIDA] Error enviando imagen:', err);
            }
        }, 1000);
    }
}

async function sendAudioToCloudAPI(to, audioUrl) {
    const { token, phoneId, line } = getWhatsAppCredentials(to);
    if (!token || !phoneId || !to) return;
    try {
        const cleanTo = String(to).split('_')[0].replace(/[^0-9]/g, '');
        console.log(`📡 [META L${line}] Enviando audio a ${cleanTo}: ${audioUrl}`);
        const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: cleanTo,
                type: "audio",
                audio: {
                    link: audioUrl
                }
            })
        });
        if (!res.ok) {
            const errData = await res.text();
            console.error(`❌ [META L${line} ERROR] al enviar audio a ${cleanTo}:`, errData);
        }
    } catch (err) { console.error('Meta send audio error:', err); }
}

async function sendAudioToMessengerAPI(psid, audioUrl) {
    if (!MESSENGER_PAGE_TOKEN || !psid) return;
    try {
        console.log(`📡 [MESSENGER] Enviando audio a ${psid}: ${audioUrl}`);
        const res = await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${MESSENGER_PAGE_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { id: psid },
                message: {
                    attachment: {
                        type: "audio",
                        payload: {
                            url: audioUrl,
                            is_reusable: true
                        }
                    }
                }
            })
        });
        if (!res.ok) {
            const errData = await res.text();
            console.error(`❌ [MESSENGER ERROR] al enviar audio a ${psid}:`, errData);
        }
    } catch (err) { console.error('Messenger send audio error:', err); }
}

async function smartSendImage(to, imageUrl, caption, origin) {
    const chat = chats[to];
    const platform = chat?.platform || 'whatsapp';
    
    const baseUrl = origin || BACKEND_URL || '';
    const fullImageUrl = imageUrl.startsWith('http') 
        ? imageUrl 
        : `${baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;

    if (platform === 'messenger') {
        return sendImageToMessengerAPI(to, fullImageUrl);
    } else {
        return sendImageToCloudAPI(to, fullImageUrl, caption);
    }
}

async function sendImageToCloudAPI(to, imageUrl, caption) {
    const { token, phoneId, line } = getWhatsAppCredentials(to);
    if (!token || !phoneId || !to) return;
    try {
        const cleanTo = String(to).split('_')[0].replace(/[^0-9]/g, '');
        console.log(`📡 [META L${line}] Enviando imagen a ${cleanTo}: ${imageUrl}`);
        const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: cleanTo,
                type: "image",
                image: {
                    link: imageUrl,
                    ...(caption ? { caption } : {})
                }
            })
        });
        if (!res.ok) {
            const errData = await res.text();
            console.error(`❌ [META L${line} ERROR] al enviar imagen a ${cleanTo}:`, errData);
        }
    } catch (err) { console.error('Meta send image error:', err); }
}

async function sendImageToMessengerAPI(psid, imageUrl) {
    if (!MESSENGER_PAGE_TOKEN || !psid) return;
    try {
        console.log(`📡 [MESSENGER] Enviando imagen a ${psid}: ${imageUrl}`);
        const res = await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${MESSENGER_PAGE_TOKEN}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { id: psid },
                message: {
                    attachment: {
                        type: "image",
                        payload: {
                            url: imageUrl,
                            is_reusable: true
                        }
                    }
                }
            })
        });
        if (!res.ok) {
            const errData = await res.text();
            console.error(`❌ [MESSENGER ERROR] al enviar imagen a ${psid}:`, errData);
        }
    } catch (err) { console.error('Messenger send image error:', err); }
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

async function downloadMetaMedia(mediaId, customerPhone) {
    // Multi-Línea: Usar el token correcto para descargar media
    const waToken = (customerPhone && chats[customerPhone]?.waLine === 2 && WHATSAPP_TOKEN_2) ? WHATSAPP_TOKEN_2 : WHATSAPP_TOKEN;
    try {
        console.log(`📡 [META] Paso 1: Obteniendo URL para Media ID: ${mediaId}`);
        const response = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
            headers: { 'Authorization': `Bearer ${waToken}` }
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
                headers: { 'Authorization': `Bearer ${waToken}` },
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

app.get('/api/vapid-public-key', (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
});

app.post('/api/push-subscribe', (req, res) => {
    const subscription = req.body;
    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Suscripción inválida' });
    }
    const exists = pushSubscriptions.some(sub => sub.endpoint === subscription.endpoint);
    if (!exists) {
        pushSubscriptions.push(subscription);
        savePushSubscriptions(pushSubscriptions);
        console.log(`📡 [PUSH] Nueva suscripción registrada. Total: ${pushSubscriptions.length}`);
    }
    res.status(201).json({ success: true });
});

app.post('/api/push-unsubscribe', (req, res) => {
    const subscription = req.body;
    if (!subscription || !subscription.endpoint) {
        return res.status(400).json({ error: 'Suscripción inválida' });
    }
    pushSubscriptions = pushSubscriptions.filter(sub => sub.endpoint !== subscription.endpoint);
    savePushSubscriptions(pushSubscriptions);
    console.log(`📡 [PUSH] Suscripción eliminada. Total: ${pushSubscriptions.length}`);
    res.json({ success: true });
});

app.post('/api/upload', (req, res) => {
    const { filename, base64 } = req.body;
    if (!filename || !base64) {
        return res.status(400).send('Missing filename or base64 data');
    }
    try {
        const cleanBase64 = base64.includes(';base64,') ? base64.split(';base64,')[1] : base64;
        const buffer = Buffer.from(cleanBase64, 'base64');
        
        const ext = filename.split('.').pop() || 'png';
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
        const filePath = path.join(UPLOADS_DIR, uniqueName);
        
        fs.writeFileSync(filePath, buffer);
        console.log(`📁 [SISTEMA] Archivo subido y guardado en: ${filePath}`);
        res.json({ url: `/uploads/${uniqueName}` });
    } catch (e) {
        console.error('Upload error:', e);
        res.status(500).send('Upload failed');
    }
});

// --- API & SOCKETS ---
app.get('/api/diagnostico', async (req, res) => {
    const results = {
        tokenConfigured: !!WHATSAPP_TOKEN,
        phoneIdConfigured: !!PHONE_ID,
        openaiKeyConfigured: !!process.env.OPENAI_API_KEY,
        uploadsDirExists: fs.existsSync(UPLOADS_DIR),
        uploadsDirWritable: false,
        metaApiConnection: 'unknown',
        metaApiError: null
    };

    try {
        const testFile = path.join(UPLOADS_DIR, 'test.txt');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        results.uploadsDirWritable = true;
    } catch (e) {
        results.uploadsDirWritable = false;
        results.uploadsDirError = e.message;
    }

    if (WHATSAPP_TOKEN) {
        try {
            const metaRes = await fetch(`https://graph.facebook.com/v20.0/1041155805754038`, {
                headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
            });
            const data = await metaRes.json();
            if (metaRes.ok) {
                results.metaApiConnection = 'OK';
            } else {
                results.metaApiConnection = 'FAILED';
                results.metaApiError = data.error || data;
            }
        } catch (e) {
            results.metaApiConnection = 'ERROR';
            results.metaApiError = e.message;
        }
    }

    res.json(results);
});

app.get('/api/media/:mediaId', async (req, res) => {
    const { mediaId } = req.params;
    if (!WHATSAPP_TOKEN) return res.status(500).send('No token');

    try {
        // Reutilizamos downloadMetaMedia que ya maneja redirects correctamente
        const buffer = await downloadMetaMedia(mediaId, null);
        if (!buffer) return res.status(404).send('Media not found or download failed');
        
        // Detectar tipo de contenido por los primeros bytes (magic bytes)
        let contentType = 'application/octet-stream';
        if (buffer[0] === 0xFF && buffer[1] === 0xD8) contentType = 'image/jpeg';
        else if (buffer[0] === 0x89 && buffer[1] === 0x50) contentType = 'image/png';
        else if (buffer[0] === 0x52 && buffer[1] === 0x49) contentType = 'image/webp';
        else if (buffer[0] === 0x47 && buffer[1] === 0x49) contentType = 'image/gif';
        else if (buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) contentType = 'audio/ogg';
        
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
            io.emit('message', { ...m, customerName, waLine: chats[nextContact.chatId]?.waLine });

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
            if (data.waLine && data.waLine !== 'all' && chat.waLine != data.waLine) return; // Filtrar por waLine
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
            createdAt: Date.now(),
            waLine: data.waLine || 1
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

    socket.on('sync_settings', (data) => { 
        if (data.line) {
            settings[data.line] = { ...settings[data.line], ...data.settings };
        } else {
            // Fallback para clientes antiguos, aunque ya no deberia ocurrir
            settings["1"] = { ...settings["1"], ...data };
        }
        saveSettings(settings); 
        io.emit('initial_settings', settings);
    });
    socket.on('sync_inventory', (data) => { inventory = data; saveInventory(inventory); socket.broadcast.emit('inventory_updated', inventory); });
    socket.on('sync_sales', (data) => { sales = data; saveSales(sales); socket.broadcast.emit('sales_updated', sales); });
    socket.on('sync_platforms', (data) => { platforms = data; savePlatforms(platforms); socket.broadcast.emit('platforms_updated', platforms); });
    socket.on('sync_providers', (data) => { providers = data; saveProviders(providers); socket.broadcast.emit('providers_updated', providers); });

app.get('/api/settings', (req, res) => res.json(settings));
app.post('/api/settings', (req, res) => {
    if (req.body.line) {
        settings[req.body.line] = { ...settings[req.body.line], ...req.body.settings };
    } else {
        settings["1"] = { ...settings["1"], ...req.body };
    }
    saveSettings(settings);
    io.emit('initial_settings', settings);
    res.json({ success: true, settings });
});
    
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
            console.log(`🔒 [SISTEMA] Chat de ${chatId} ${blocked ? 'bloqueado' : 'desbloqueado'}.`);
        }
    });

    socket.on('test_ai', async (data, callback) => callback(await getAIResponse(data.content, data.history, data.waLine || 1)));
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
    socket.on('send_message', async ({ to, content, imageUrl, origin }) => {
        if (content && /^r$/i.test(content.trim())) { console.log('El comando r ha sido desactivado'); return; }
        
        let m;
        if (imageUrl) {
            await smartSendImage(to, imageUrl, content, origin);
            m = { 
                id: 'man-'+Date.now(), 
                from: to, 
                body: content || '[Imagen]', 
                content: content || '[Imagen]', 
                imageUrl: imageUrl,
                isMe: true, 
                role: 'bot', 
                timestampRaw: Date.now() 
            };
        } else {
            const wamid = await smartSendMessage(to, content);
            m = { 
                id: wamid || ('man-'+Date.now()), 
                wamid: wamid || null,
                status: 'sent',
                from: to, 
                body: content, 
                content, 
                isMe: true, 
                role: 'bot', 
                timestampRaw: Date.now() 
            };
        }
        
        if (!chats[to]) chats[to] = { from: to, customerName: 'Cliente', messages: [] };
        chats[to].messages.push(m); chats[to].updatedAt = Date.now(); 
        
        // Si el admin envió credenciales manualmente, marcar el chat
        if (content) {
            const lowerContent = content.toLowerCase();
            if ((lowerContent.includes('correo') || lowerContent.includes('email')) && 
                (lowerContent.includes('clave') || lowerContent.includes('contraseña') || lowerContent.includes('pass'))) {
                chats[to].credentialsDelivered = true;
                console.log(`✅ [SISTEMA] Credenciales manuales detectadas para ${chats[to].customerName}. Flag activado.`);
            }
        }
        
        if (recoveryTimers[to]) clearTimeout(recoveryTimers[to]);
        saveChats(chats); io.emit('message', { ...m, waLine: chat.waLine });
        scheduleRecovery(to);
    });
});

async function sendMessageToCloudAPI(to, text) {
    const { token, phoneId, line } = getWhatsAppCredentials(to);
    if (!token || !phoneId || !to) return null;
    try {
        const cleanTo = String(to).split('_')[0].replace(/[^0-9]/g, '');
        const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messaging_product: "whatsapp", to: cleanTo, type: "text", text: { body: text } })
        });
        if (!res.ok) {
            const errData = await res.text();
            console.error(`❌ [META L${line} ERROR] al enviar a ${cleanTo}:`, errData);
            return null;
        }
        const data = await res.json();
        return data.messages?.[0]?.id || null;
    } catch (err) { console.error('Meta send error:', err); return null; }
}

async function getAIResponse(message, history = [], waLine = 1) {
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
        const antiHallucinationRules = "\n\n### REGLA INQUEBRANTABLE - PROHIBICIÓN DE DATOS FALSOS Y REGISTRO DE PEDIDOS:\n1. NUNCA inventes datos de acceso, correos ni números de guía falsos.\n2. Cuando el cliente proporcione los 5 datos de envío completos, responde ÚNICAMENTE con las etiquetas: [ENTREGAR_AHORA] [PRODUCTOS: NombreDelProducto].\n3. Si el cliente solicita soporte específico sobre su paquete o guía de envío, usa [APAGAR_BOT_SOPORTE].";

        const mathRules = "\n\n### REGLAS DE CÁLCULO Y PRESENTACIÓN (PRECIOS EN QUETZALES):\n1. Respeta siempre los precios exactos en Quetzales (Q) del catálogo.\n2. Para la venta de Shilajit en Cápsulas, informa claramente la oferta disponible (Q155 1 frasco, Q244 2 frascos, Q330 3 frascos).\n3. ¡OBLIGATORIO!: En CADA cotización u oferta debes recalcar juntos: ENVÍO GRATIS y PAGO CONTRA ENTREGA (pagas en efectivo al recibir tu paquete en mano).";

        const dynamicStrategyRules = `

### EMBUDO CONVERSACIONAL ESTRICTO (ADAPTABLE A CUALQUIER PRODUCTO)
ERES UN EXPERTO EN VENTAS CONSULTIVAS. Tu objetivo es guiar al cliente por un embudo de 5 etapas, avanzando UNA SOLA ETAPA por mensaje. NO TE SALTES ETAPAS. Si el cliente muestra urgencia directa por comprar (ej: "quiero comprar", "cuánto cuesta", "envíamelo"), pasa directo a mostrar precios y cerrar.

IMPORTANTE: Usa la información de TU PRODUCTO que está arriba en el prompt del sistema. NUNCA hables de productos que no están en tu catálogo.

ETAPA 1 — BIENVENIDA Y PRIMERA PREGUNTA:
Saluda cálidamente y pregunta qué problema o necesidad tiene el cliente. NO ofrezcas el producto aún. Solo escucha.
Ejemplo: "¡Hola! 👋 Qué bueno que escribiste. ¿Me cuentas qué es lo que te está molestando o qué estás buscando?"

ETAPA 2 — EMPATIZAR Y PROFUNDIZAR:
Muestra empatía genuina con lo que el cliente dijo. Hazle una pregunta de seguimiento para entender mejor su situación (hace cuánto lo tiene, qué ha probado, etc.).

ETAPA 3 — EXPLICAR EL PROBLEMA:
Dale una explicación breve y creíble de POR QUÉ tiene ese problema. Usa datos o lógica que conecten con su situación. Cierra diciendo que hay una buena solución.

ETAPA 4 — PRESENTAR TU PRODUCTO COMO LA SOLUCIÓN:
Presenta el producto con sus beneficios clave (usa los que están en el prompt del sistema). Menciona envío gratis y pago contra entrega.

ETAPA 5 — CIERRE CON OPCIONES DE PRECIO:
Muestra las opciones de precio/combos disponibles (usa los precios exactos del prompt del sistema). Pregunta: "¿Con cuál te gustaría empezar?"

DESPUÉS DEL CIERRE: Si el cliente elige una opción, pídele sus datos de envío (nombre, teléfono, ciudad, dirección, producto elegido). Cuando los dé completos, usa las etiquetas [ENTREGAR_AHORA] [PRODUCTOS: NombreDelProducto].

REGLA DE ORO: Responde SOLO sobre los productos que tienes en tu catálogo/prompt. Si el cliente pregunta por algo que SÍ vendes, atiéndelo. NUNCA digas que no vendes algo si está en tu prompt.`;

        const comp = await activeOpenAI.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: `${settings[waLine]?.systemPrompt || settings["1"].systemPrompt}${antiHallucinationRules}${mathRules}${dynamicStrategyRules}\n\n${purchaseHistory}\n\nStock actual para entrega instantánea (USA ESTOS PRECIOS): ${inv}` },
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

if (fs.existsSync(DIST_DIR)) {
    app.get(/.*/, (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
            return next();
        }
        res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor CRM listo y escuchando en el puerto ${PORT}`);
});
