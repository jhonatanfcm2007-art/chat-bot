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
    },
    maxHttpBufferSize: 1e8 // Aumentar el límite a 100MB para evitar que falle el envío de historial
});

const openai = (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 20)
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

// Configuración de Meta desde .env
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const ADMIN_PHONE = process.env.ADMIN_PHONE;

// Configuración Líneas Adicionales de WhatsApp (Multi-Línea)
const WHATSAPP_TOKEN_2 = (process.env.WHATSAPP_TOKEN_2 || '').trim();
const PHONE_ID_2 = (process.env.WHATSAPP_PHONE_ID_2 || process.env.PHONE_ID_2 || '').trim();
const WHATSAPP_TOKEN_3 = (process.env.WHATSAPP_TOKEN_3 || '').trim();
const PHONE_ID_3 = (process.env.WHATSAPP_PHONE_ID_3 || process.env.PHONE_ID_3 || '').trim();

// Configuración Messenger
const MESSENGER_PAGE_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
const MESSENGER_VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN || VERIFY_TOKEN;

console.log('--- [SISTEMA] Diagnóstico de Variables ---');
console.log('OpenAI Key:', process.env.OPENAI_API_KEY ? `Detectada (${process.env.OPENAI_API_KEY.substring(0, 10)}...)` : '❌ FALTANTE');
console.log('📱 Línea 1 - WhatsApp Token:', WHATSAPP_TOKEN ? '✅ Detectado' : '❌ FALTANTE');
console.log('📱 Línea 1 - Phone ID:', PHONE_ID ? `✅ ${PHONE_ID}` : '❌ FALTANTE');
console.log('📱 Línea 2 - Phone ID:', PHONE_ID_2 ? `✅ ${PHONE_ID_2}` : '❌ FALTANTE');
console.log('📱 Línea 3 - Phone ID:', PHONE_ID_3 ? `✅ ${PHONE_ID_3}` : '❌ FALTANTE');
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

// Endpoint Remarketing
app.get('/api/customers', (req, res) => {
    res.json(customersDb);
});

// Endpoints Base de Conocimiento
app.get('/api/knowledge-base', (req, res) => {
    res.json(knowledgeBaseDb);
});

app.get('/api/debug-products', (req, res) => {
    const counts = {};
    let total = 0;
    let unassigned = 0;
    Object.values(chats).forEach(chat => {
        total++;
        if (chat.assignedProduct) {
            const p = chat.assignedProduct;
            counts[p] = (counts[p] || 0) + 1;
        } else {
            unassigned++;
        }
    });
    res.json({ total, unassigned, counts, kb: knowledgeBaseDb.map(p => p.name) });
});

app.post('/api/knowledge-base', (req, res) => {
    const newProduct = { ...req.body, id: 'prod-' + Date.now() };
    knowledgeBaseDb.push(newProduct);
    saveKnowledgeBase(knowledgeBaseDb);
    backfillProducts();
    res.json({ success: true, product: newProduct });
});

app.put('/api/knowledge-base/:id', (req, res) => {
    const id = req.params.id;
    const index = knowledgeBaseDb.findIndex(p => p.id === id);
    if (index !== -1) {
        knowledgeBaseDb[index] = { ...knowledgeBaseDb[index], ...req.body };
        saveKnowledgeBase(knowledgeBaseDb);
        backfillProducts();
        res.json({ success: true, product: knowledgeBaseDb[index] });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

app.delete('/api/knowledge-base/:id', (req, res) => {
    knowledgeBaseDb = knowledgeBaseDb.filter(p => p.id !== req.params.id);
    saveKnowledgeBase(knowledgeBaseDb);
    // Note: We don't remove assignedProduct from old chats here, to keep their history intact.
    // If they want to reassign, they can just create the new product.
    res.json({ success: true });
});

// --- STORES API ---
app.get('/api/stores', (req, res) => {
    res.json(storesDb);
});

app.post('/api/stores', (req, res) => {
    const newStore = {
        id: 'store-' + Date.now(),
        owner: req.body.owner || 'General',
        name: req.body.name || 'Nueva Tienda',
        shopifyStoreUrl: req.body.shopifyStoreUrl || '',
        shopifyAccessToken: req.body.shopifyAccessToken || '',
        createdAt: new Date().toISOString()
    };
    storesDb.push(newStore);
    saveStores(storesDb);
    res.json({ success: true, store: newStore });
});

app.put('/api/stores/:id', (req, res) => {
    const index = storesDb.findIndex(s => s.id === req.params.id);
    if (index !== -1) {
        storesDb[index] = { ...storesDb[index], ...req.body };
        saveStores(storesDb);
        res.json({ success: true, store: storesDb[index] });
    } else {
        res.status(404).json({ success: false, error: 'Store not found' });
    }
});

app.delete('/api/stores/:id', (req, res) => {
    storesDb = storesDb.filter(s => s.id !== req.params.id);
    saveStores(storesDb);
    res.json({ success: true });
});

// Endpoint secreto para depurar webhooks de Meta
app.get('/api/webhook-debug', (req, res) => {
    res.json(webhookLogs);
});

function getWhatsAppCredentials(customerPhone, forceLine = null) {
    if (forceLine === 3 && WHATSAPP_TOKEN_3 && PHONE_ID_3) return { token: WHATSAPP_TOKEN_3, phoneId: PHONE_ID_3, line: 3 };
    if (forceLine === 2 && WHATSAPP_TOKEN_2 && PHONE_ID_2) return { token: WHATSAPP_TOKEN_2, phoneId: PHONE_ID_2, line: 2 };
    if (forceLine === 1 && WHATSAPP_TOKEN && PHONE_ID) return { token: WHATSAPP_TOKEN, phoneId: PHONE_ID, line: 1 };

    const chat = chats?.[customerPhone];
    if (chat?.waLine === 3 && WHATSAPP_TOKEN_3 && PHONE_ID_3) {
        return { token: WHATSAPP_TOKEN_3, phoneId: PHONE_ID_3, line: 3 };
    }
    if (chat?.waLine === 2 && WHATSAPP_TOKEN_2 && PHONE_ID_2) {
        return { token: WHATSAPP_TOKEN_2, phoneId: PHONE_ID_2, line: 2 };
    }
    return { token: WHATSAPP_TOKEN, phoneId: PHONE_ID, line: 1 };
}

let lastReceiptFrom = null; 
const aiTimers = {};
const webhookLogs = []; // Stores last 20 webhooks for debugging

// --- NOTIFICATIONS HELPERS ---
function getCountryFromPhone(phoneStr) {
    if (!phoneStr) return 'Desconocido';
    const clean = String(phoneStr).replace(/\D/g, '');
    if (clean.startsWith('502')) return 'Guatemala';
    if (clean.startsWith('503')) return 'El Salvador';
    if (clean.startsWith('504')) return 'Honduras';
    if (clean.startsWith('505')) return 'Nicaragua';
    if (clean.startsWith('506')) return 'Costa Rica';
    if (clean.startsWith('507')) return 'Panamá';
    if (clean.startsWith('52')) return 'México';
    if (clean.startsWith('56')) return 'Chile';
    if (clean.startsWith('57')) return 'Colombia';
    if (clean.startsWith('593')) return 'Ecuador';
    if (clean.startsWith('51')) return 'Perú';
    return 'Desconocido';
}

function notifyAdmins(chat, text, type = 'sales') {
    let targetPhone = ADMIN_PHONE;
    
    // Check if product has a custom admin phone
    if (chat) {
        let prodName = chat.assignedProduct || chat.pendingApprovalProducts;
        if (prodName) {
            // Strip quantities like " x1", " x2" to get base product name
            prodName = prodName.replace(/\s*x\s*\d+$/i, '').trim();
            const lowerProdName = prodName.toLowerCase();
            
            let prod = knowledgeBaseDb.find(p => p.name.trim().toLowerCase() === lowerProdName);
            
            // Búsqueda difusa si el match exacto falla (ej. "1 Tarro de Creatina" vs "Creatina Salvador")
            if (!prod) {
                prod = knowledgeBaseDb.find(p => {
                    const lowerKBName = p.name.toLowerCase();
                    return lowerProdName.includes(lowerKBName) || 
                           (p.keywords && p.keywords.some(kw => lowerProdName.includes(kw.toLowerCase().trim())));
                });
            }
            
            if (prod) {
                if (prod.adminPhone && prod.adminPhone.trim() !== '') {
                    targetPhone = prod.adminPhone.trim();
                } else {
                    // El producto existe pero no configuraron su número.
                    // Descartamos la notificación para no hacer spam al número global.
                    targetPhone = null;
                }
            }
        }
    }

    if (!targetPhone) return;

    // Append Country Info
    let country = 'Desconocido';
    if (chat && chat.from) {
        country = getCountryFromPhone(chat.from);
    }
    
    const finalMessage = `🌍 *País:* ${country}\n${text}`;
    
    let forceLine = 1;
    if (type === 'support') {
        forceLine = parseInt(process.env.SUPPORT_WA_LINE) || 3;
    }
    
    if (targetPhone === ADMIN_PHONE) {
        // Enviar a Google Sheets en lugar de WhatsApp
        const webhookUrl = "https://script.google.com/macros/s/AKfycbw26RxXkXjyX-Q7Sswj_mafxjtvsFW59b3uGN00Zvox-RV0_9O_-OOmWpe8gvntT92-/exec";
        
        const payload = {
            "fecha": new Date().toISOString(),
            "date": new Date().toISOString(),
            "Estado": type === 'support' ? 'Soporte/Error' : 'Aprobado',
            "status": type === 'support' ? 'Soporte/Error' : 'Aprobado',
            "type": type,
            "cliente": chat ? (chat.orderName || '') : '',
            "name": chat ? (chat.orderName || '') : '',
            "telefono": chat ? (chat.from || '') : '',
            "phone": chat ? (chat.from || '') : '',
            "direccion": chat ? (chat.address || '') : '',
            "address": chat ? (chat.address || '') : '',
            "municipio": chat ? (chat.city || '') : '',
            "city": chat ? (chat.city || '') : '',
            "departamento": chat ? (chat.province || '') : '',
            "province": chat ? (chat.province || '') : '',
            "producto": chat ? (chat.assignedProduct || chat.pendingApprovalProducts || '') : '',
            "product": chat ? (chat.assignedProduct || chat.pendingApprovalProducts || '') : '',
            "error/info": finalMessage,
            "message": finalMessage,
            "error": finalMessage,
            "info": finalMessage,
            "detalle": finalMessage,
            "text": finalMessage,
            "country": country
        };
        
        fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => console.error("Error enviando a Google Sheets:", err));
    } else {
        // Socios: Seguir enviando por WhatsApp
        smartSendMessage(targetPhone, finalMessage, forceLine);
    }
}

// --- PERSISTENCIA ---
const DATA_DIR = path.join(__dirname, 'data');
const INVENTORY_FILE = path.join(DATA_DIR, 'inventory.json');
const SALES_FILE = path.join(DATA_DIR, 'sales.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const PLATFORMS_FILE = path.join(DATA_DIR, 'platforms.json');
const PROVIDERS_FILE = path.join(DATA_DIR, 'providers.json');
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'campaigns.json');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');
const KNOWLEDGE_BASE_FILE = path.join(DATA_DIR, 'knowledge_base.json');
const STORES_FILE = path.join(DATA_DIR, 'stores.json');
const ANOMALIES_FILE = path.join(DATA_DIR, 'anomalies.json');
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
    function saveVapidKeys(keys) { atomicSave(VAPID_FILE, keys); }
    saveVapidKeys(vapidKeys);
    try {
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

function savePushSubscriptions(subs) { atomicSave(SUBSCRIPTIONS_FILE, subs); }

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
    app.use(express.static(DIST_DIR, {
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
                res.setHeader('Surrogate-Control', 'no-store');
            }
        }
    }));
} else {
    app.get('/', (req, res) => res.send('Backend Chatbot CRM running 🚀'));
}

// --- DATA LOADING & SAVING ---
// Funciones seguras de guardado atómico
let isSaving = false;
function atomicSave(filePath, data) {
    try {
        const tmpPath = filePath + '.tmp';
        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
        fs.renameSync(tmpPath, filePath); // Operación atómica a nivel de OS
    } catch (e) {
        console.error(`Error en guardado atómico para ${filePath}:`, e);
    }
}

function loadInventory() {
    try {
        if (fs.existsSync(INVENTORY_FILE)) return JSON.parse(fs.readFileSync(INVENTORY_FILE, 'utf-8'));
    } catch (err) { console.error('Error loading inventory:', err); }
    return [];
}
function saveInventory(data) { atomicSave(INVENTORY_FILE, data); }

function loadSales() {
    try {
        if (fs.existsSync(SALES_FILE)) return JSON.parse(fs.readFileSync(SALES_FILE, 'utf-8'));
    } catch (err) { console.error('Error loading sales:', err); }
    return [];
}
function saveSales(data) { atomicSave(SALES_FILE, data); }

function loadChats() {
    try {
        if (fs.existsSync(CHATS_FILE)) {
            const data = JSON.parse(fs.readFileSync(CHATS_FILE, 'utf-8'));
            Object.keys(data).forEach(id => {
                if (!data[id].updatedAt) data[id].updatedAt = Date.now();
            });
            
            const entries = Object.entries(data);
            const MAX_CHATS = 15000;
            
            if (entries.length > MAX_CHATS) {
                console.log(`[LIMPIEZA] Reduciendo chats de ${entries.length} a ${MAX_CHATS} más recientes...`);
                entries.sort(([, a], [, b]) => b.updatedAt - a.updatedAt);
                
                const trimmedData = {};
                for (let i = 0; i < MAX_CHATS; i++) {
                    trimmedData[entries[i][0]] = entries[i][1];
                }
                
                // Guardar inmediatamente para liberar espacio en disco
                atomicSave(CHATS_FILE, trimmedData);
                return trimmedData;
            }
            
            return data;
        }
    } catch (err) { console.error('Error loading chats:', err); }
    return {};
}
function saveChats(data) { atomicSave(CHATS_FILE, data); }

function loadAnomalies() {
    if (fs.existsSync(ANOMALIES_FILE)) {
        try { return JSON.parse(fs.readFileSync(ANOMALIES_FILE, 'utf-8')); } catch (e) { console.error('Error cargando anomalías:', e); }
    }
    return [];
}
function saveAnomalies(data) { atomicSave(ANOMALIES_FILE, data); }

function registerAnomaly(type, customerName, from) {
    const newAnomaly = {
        id: 'anomaly-' + Date.now(),
        type,
        customerName: customerName || 'Desconocido',
        from,
        date: new Date().toISOString(),
        resolved: false
    };
    anomalies.unshift(newAnomaly);
    if (anomalies.length > 200) anomalies.pop(); // Keep only last 200
    saveAnomalies(anomalies);
    io.emit('anomalies_updated', anomalies);
}

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
function saveSettings(data) { atomicSave(SETTINGS_FILE, data); }

function loadPlatforms() {
    try {
        if (fs.existsSync(PLATFORMS_FILE)) return JSON.parse(fs.readFileSync(PLATFORMS_FILE, 'utf-8'));
    } catch (err) {}
    return ['Shilajit Resina', 'Combos Promocionales'];
}
function savePlatforms(data) { atomicSave(PLATFORMS_FILE, data); }

function loadProviders() {
    try {
        if (fs.existsSync(PROVIDERS_FILE)) return JSON.parse(fs.readFileSync(PROVIDERS_FILE, 'utf-8'));
    } catch (err) {}
    return ['Himalaya Natural', 'Laboratorio Oficial'];
}
function saveProviders(data) { atomicSave(PROVIDERS_FILE, data); }

function loadCampaigns() {
    try {
        if (fs.existsSync(CAMPAIGNS_FILE)) return JSON.parse(fs.readFileSync(CAMPAIGNS_FILE, 'utf-8'));
    } catch (err) { console.error('Error loading campaigns:', err); }
    return [];
}
function saveCampaigns(data) { atomicSave(CAMPAIGNS_FILE, data); }

// --- DATA INITIALIZATION ---
let inventory = loadInventory();
let sales = loadSales();
let chats = loadChats();
let settings = loadSettings();

// MIGRACIÓN DE PROMPT: Añadir reglas de envío de fotos e interés si no existen
let settingsModified = false;
Object.keys(settings).forEach(line => {
    if (settings[line].systemPrompt && !settings[line].systemPrompt.includes('[ENVIAR_FOTO]')) {
        settings[line].systemPrompt += `\n\n### ETIQUETAS ESPECIALES OBLIGATORIAS:\n- Si el cliente te pide fotos, imágenes o resultados del producto, debes incluir la etiqueta [ENVIAR_FOTO] en tu respuesta para que el sistema le envíe la foto automáticamente.\n- Tan pronto como identifiques qué combo o producto le interesa al cliente (incluso antes de que confirme el pedido), incluye la etiqueta [INTERES: NombreDelCombo] (ejemplo: [INTERES: Combo 2 Tarros]). Si cambia de opinión, envíala de nuevo con el nuevo interés.`;
        settingsModified = true;
    }
});
if (settingsModified) saveSettings(settings);

let platforms = loadPlatforms();
let providers = loadProviders();
let campaigns = loadCampaigns();
let anomalies = loadAnomalies();

function loadCustomers() {
    try {
        if (fs.existsSync(CUSTOMERS_FILE)) {
            return JSON.parse(fs.readFileSync(CUSTOMERS_FILE, 'utf-8'));
        }
    } catch (e) {
        console.error('Error loading customers:', e);
    }
    return [];
}
function saveCustomers(data) { atomicSave(CUSTOMERS_FILE, data); }
let customersDb = loadCustomers();

// --- RESTAURACIÓN DE EMERGENCIA ---
// Si los chats están vacíos pero los clientes existen (ej. corrupción en reinicio),
// reconstruir los contenedores de chat básicos para no perder los contactos.
if (Object.keys(chats).length < customersDb.length) {
    let restoredCount = 0;
    for (const customer of customersDb) {
        if (!chats[customer.phone]) {
            chats[customer.phone] = {
                customerName: customer.name || 'Cliente Recuperado',
                messages: [],
                tags: ['interesado'], // Etiqueta por defecto para que no se pierdan
                updatedAt: customer.firstSeen || Date.now()
            };
            restoredCount++;
        }
    }
    if (restoredCount > 0) {
        console.log(`⚠️ [EMERGENCIA] Se han restaurado ${restoredCount} chats básicos desde customers.json`);
        saveChats(chats);
    }
}

function loadKnowledgeBase() {
    try {
        if (fs.existsSync(KNOWLEDGE_BASE_FILE)) {
            return JSON.parse(fs.readFileSync(KNOWLEDGE_BASE_FILE, 'utf-8'));
        }
    } catch (e) {
        console.error('Error loading knowledge base:', e);
    }
    return [];
}
function saveKnowledgeBase(data) { atomicSave(KNOWLEDGE_BASE_FILE, data); }
let knowledgeBaseDb = loadKnowledgeBase();

function loadStores() {
    try {
        if (fs.existsSync(STORES_FILE)) {
            return JSON.parse(fs.readFileSync(STORES_FILE, 'utf-8'));
        }
    } catch (e) {
        console.error('Error loading stores:', e);
    }
    return [];
}
function saveStores(data) { atomicSave(STORES_FILE, data); }
let storesDb = loadStores();

// MIGRACIÓN A BASE DE CONOCIMIENTO DINÁMICA
(function initKnowledgeBase() {
    if (knowledgeBaseDb.length === 0) {
        knowledgeBaseDb = [
            {
                id: 'prod-1',
                line: '1',
                name: 'Shilajit Ultra en Cápsulas',
                keywords: ['shilajit', 'energia', 'capsulas', 'testosterona', 'rendimiento'],
                prices: '- 🌿 1 Frasco (60 Cápsulas): Q155\n- 🎁 Combo 2 Frascos: Q244\n- 🔥 Combo 3 Frascos: Q330',
                details: 'FLUJO DE VENTAS (Reglas de Oro):\n1. RESPONDE LA PREGUNTA DEL CLIENTE PRIMERO. Si te hacen una pregunta directa (ej. "¿Es cápsula?", "¿Tiene efectos secundarios?"), responde a su duda de forma natural y coherente ANTES de continuar con el siguiente paso del flujo.\n2. ESTÁ PROHIBIDO UNIR DOS PASOS EN UN SOLO MENSAJE. Nunca envíes los precios sin que el cliente haya respondido al paso anterior.\n3. Si preguntan si "engruesa" o "alarga", RESPONDE QUE SÍ (gracias al aumento masivo de flujo sanguíneo, se nota desde la 2da/3ra semana).\n\nPASOS DEL EMBUDO:\n\nMensaje 1 — Exploración:\nPregunta si busca el Shilajit para energía diaria o para potenciar su rendimiento y vigor sexual. (Si el cliente ya fue directo a otra cosa, responde su duda y avanza al Mensaje 2).\n\nMensaje 2 — Beneficios Agresivos:\nIMPORTANTE: No digas "Te entiendo perfectamente" a menos que el cliente realmente te haya contado un problema personal. Adapta tu respuesta a lo que dijo el cliente. Luego, menciona los beneficios clave: "Después de los 30 años la testosterona cae. El Shilajit Ultra actúa como una bomba natural: dispara la testosterona, devuelve la firmeza, aumenta radicalmente el deseo y da una resistencia en la intimidad como si tuvieras 20 años de nuevo. Sin químicos."\nTermina siempre con esta pregunta: "¿Te gustaría conocer las opciones de tratamiento para empezar a notar el cambio esta misma semana?"\n\nMensaje 3 — Opciones y Precios:\nDile: "Tenemos estas dos opciones (con GARANTÍA TOTAL de devolución de dinero en 15 días si no sientes mejora):\n🌿 1 Frasco (60 cápsulas): Q155\n🎁 Combo 2 Frascos: Q244 — (El más pedido) tratamiento completo.\nLa gran mayoría empieza con el combo porque la pareja nota la diferencia de inmediato 😎. ¿Con cuál te gustaría empezar?"\n\nMensaje 4 — Cierre:\nPide dirección completa, municipio y teléfono alterno. Recuerda que el envío es GRATIS a todo el país y el pago es en efectivo al recibir.'
            },
            {
                id: 'prod-2',
                line: '2',
                name: 'Rodillera Térmica',
                keywords: ['rodillera', 'rodillas', 'dolor', 'artritis', 'termica'],
                prices: '- 🦵 1 Rodillera: Q149\n- 🎁 Combo 2 Rodilleras: Q249\n- 🔥 Combo 3 Rodilleras: Q329',
                details: 'Rodillera térmica de compresión. Alivia el dolor de rodilla, artritis, inflamación. Tecnología de calor terapéutico. Ideal para deportistas y adultos mayores.\n\nIMPORTANTE: En tu propuesta de precios/cierre, menciónale al cliente de forma natural que cuenta con GARANTÍA TOTAL: si en 15 días no siente mejora, le devolvemos su dinero sin hacer preguntas.'
            }
        ];
        saveKnowledgeBase(knowledgeBaseDb);
        console.log('✅ [CONFIG] Base de Conocimiento inicializada con productos por defecto.');
    }
})();

function assignProductToChat(chat, msgBody, adId, waLine, fromPhone) {
    const lineProducts = knowledgeBaseDb.filter(p => {
        const pLine = p.line || '1';
        const isCorrectLine = pLine === String(waLine) || pLine === 'Ambas' || pLine === 'all';
        if (p.phonePrefix && p.phonePrefix.trim() !== '') {
            const cleanPhone = String(fromPhone).replace('+', '').trim();
            const cleanPrefix = p.phonePrefix.replace('+', '').trim();
            if (!cleanPhone.startsWith(cleanPrefix)) return false;
        }
        return isCorrectLine;
    });
    
    // Extracción profunda del ID de anuncio (por si el usuario lo pegó manual o la API no trajo el objeto referral)
    let finalAdId = adId;
    if (!finalAdId && msgBody) {
        const match = msgBody.match(/ID:\s*(\d+)/i);
        if (match) finalAdId = match[1];
    }
    
    // 1. PRIORIDAD ABSOLUTA: Si entra desde un Anuncio, buscamos en TODA la base de datos sin importar la línea de WA.
    if (finalAdId) {
        const matched = knowledgeBaseDb.find(p => p.adIds?.includes(String(finalAdId).trim()));
        if (matched) {
            chat.assignedProduct = matched.name;
            return;
        }
    }
    
    // Si ya tiene producto asignado y no entró por un anuncio nuevo, lo conservamos.
    if (chat.assignedProduct) return;
    
    // 2. PALABRAS CLAVE: Si no hay adId, buscamos por palabras clave en el mensaje.
    if (msgBody) {
        const lowerBody = msgBody.toLowerCase();
        for (const p of lineProducts) {
            if (p.keywords && p.keywords.length > 0) {
                if (p.keywords.some(kw => lowerBody.includes(kw.toLowerCase().trim()))) {
                    chat.assignedProduct = p.name;
                    return;
                }
            }
        }
    }
}

// BACKFILL EXISTING CHATS
function backfillProducts() {
    let changed = false;
    Object.values(chats).forEach(chat => {
        if (!chat.assignedProduct && chat.messages && chat.messages.length > 0) {
            // Check for adId in the first message first
            const firstMsg = chat.messages.find(m => !m.isMe && m.body) || chat.messages[0];
            if (firstMsg && firstMsg.body) {
                const adIdMatch = firstMsg.body.match(/ID:\s*(\d+)/i);
                const adId = adIdMatch ? adIdMatch[1] : null;
                assignProductToChat(chat, firstMsg.body, adId, chat.waLine || 1, chat.from);
            }
            
            // If still not assigned, scan all user messages for keywords
            if (!chat.assignedProduct) {
                const userMessages = chat.messages.filter(m => !m.isMe && m.body);
                for (const msg of userMessages) {
                    assignProductToChat(chat, msg.body, null, chat.waLine || 1, chat.from);
                    if (chat.assignedProduct) break;
                }
            }
            
            if (chat.assignedProduct) changed = true;
        }
    });
    if (changed) {
        saveChats(chats);
        console.log('✅ [CONFIG] Productos asignados a chats antiguos tras escaneo completo.');
        
        // Emit updated chats to clients so the UI updates in real-time
        if (typeof io !== 'undefined') {
            io.emit('initial_state', { 
                chats, 
                settings, 
                salesHistory, 
                accounts, 
                products: productsDb, 
                globalRules,
                knowledgeBase: knowledgeBaseDb,
                customers: customersDb
            });
        }
    }
}

// Run once on boot
backfillProducts();

// Configurar un prompt base corto si aún no está configurado
    const basePrompt = `Eres un asesor de ventas virtual experto y persuasivo por WhatsApp. 
Tu objetivo es identificar qué producto busca el cliente de tu catálogo. 
Si el cliente no especifica el producto por su nombre, ESTÁ ESTRICTAMENTE PROHIBIDO adivinar o asumir qué producto quiere. Pregúntale amable y directamente qué producto busca o ofrécele el catálogo.
Si el cliente menciona o insinúa uno de los productos de tu Base de Conocimientos, USA ESTRICTAMENTE la información de ese producto para venderle, siguiendo el embudo de ventas.

REGLAS DE ORO GLOBALES:
1. NUNCA inventes precios, promociones o productos que no estén en la Base de Conocimiento.
2. NUNCA envíes dos mensajes del embudo de ventas al mismo tiempo. Debes esperar la respuesta del cliente antes de avanzar.
3. Si el cliente tiene dudas, respóndelas de forma natural, empática y persuasiva, sin salirte de tu rol de experto.
4. Si el cliente pregunta si puede programar una entrega para una fecha específica (ej. "el martes", "la próxima semana"), responde SIEMPRE QUE SÍ amablemente y toma su pedido con normalidad. NUNCA digas que no se puede programar.
5. NUNCA recomiendes consultar a un médico ni des advertencias médicas. Todos nuestros productos ya están clínicamente comprobados, son 100% seguros y aprobados por médicos.
6. EXCEPCIÓN AL EMBUDO: Si el cliente insiste en saber el PRECIO directamente, sáltate el paso de los beneficios y mándale las opciones de precios inmediatamente, con su respectiva pregunta de cierre.
7. Si el cliente pregunta algo que NO sabes o que no está en la Base de Conocimiento (ej. "¿dónde está su local?", "¿tienen tienda física?", "¿puedo recogerlo?"), NUNCA digas "no puedo dar esa información". Simplemente responde de forma natural que en un momento un asesor humano le ayudará con esa duda y usa la etiqueta [APAGAR_BOT_SOPORTE] al final de tu mensaje para apagarte.

### 🛒 REGISTRO DE PEDIDOS:
Cuando el cliente haya proporcionado sus datos de despacho (nombre, celular, ciudad/departamento y dirección), NO le pidas confirmación. Inmediatamente registra el pedido respondiendo SOLO con este formato exacto de etiquetas ocultas (asegúrate de llenar todos los campos extraídos):

[ENTREGAR_AHORA]
[PRODUCTOS: NombreDelProducto]
[NOMBRE: Nombre del Cliente]
[TELEFONO: Número de Celular]
[DIRECCION: Dirección Exacta]
[MUNICIPIO: Municipio o Ciudad]
[DEPARTAMENTO: Departamento o Provincia]
[REFERENCIAS: Cualquier referencia]

Ejemplo:
¡Excelente! Tu pedido ha sido confirmado. [ENTREGAR_AHORA] [PRODUCTOS: 1 Frasco Shilajit] [NOMBRE: Juan Perez] [TELEFONO: 3001234567] [DIRECCION: Calle 123 #45-67] [MUNICIPIO: Bogota] [DEPARTAMENTO: Bogota D.C.]

### ETIQUETAS DE SEGUIMIENTO INTERNO:
- Si el cliente muestra interés real en comprar (ej. pregunta precios, envío) pero aún no deja datos de envío, incluye (solo una vez) al final de tu respuesta la etiqueta: [INTERESADO]
- Si el cliente estaba en proceso de dar sus datos y luego se desanima o la conversación se estanca sin llegar a la venta, incluye la etiqueta: [ABANDONADO]`;

    if (!settings["1"].systemPrompt || !settings["1"].systemPrompt.includes('APAGAR_BOT_SOPORTE')) {
        settings["1"].systemPrompt = basePrompt;
        settings["2"].systemPrompt = basePrompt;
        saveSettings(settings);
        console.log('🔄 [CONFIG] System Prompt migrado a versión nueva (con regla de apagado ante dudas desconocidas).');
    }


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
                const followUpMsg = "Hola de nuevo 👋 Solo quería confirmarte que aún tenemos stock disponible hoy. Muchos de nuestros clientes ya están sintiendo los resultados — no quiero que te quedes sin tu pedido. ¿Te ayudo a coordinar el envío?";
                
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

function extractSaleData(phone, productStr) {
    const phoneStr = phone.toString();
    const isHonduras = phoneStr.startsWith('504') || phoneStr.startsWith('+504');
    const country = isHonduras ? 'HN' : 'GT';
    const currency = isHonduras ? 'HNL' : 'GTQ';
    
    let price = 0;
    if (productStr) {
        const priceMatch = productStr.match(/(?:Q|L|Lps|Quetzales|Lempiras|\$)\s*(\d+(?:[.,]\d+)?)/i);
        if (priceMatch) {
            price = parseFloat(priceMatch[1].replace(',', '.'));
        }
    }
    return { country, currency, price };
}

// --- REGISTRO DE PEDIDO (PENDIENTE DE APROBACION) ---
async function registerOrder(to, products) {
    const chat = chats[to];
    if (!chat) return;

    const productList = products || 'Producto solicitado';
    
    const orderName = chat.orderName || chat.customerName || 'No especificado';
    const orderPhone = chat.orderPhone || 'No especificado';
    const orderAddress = chat.address || 'No especificada';
    const orderCity = chat.city || 'No especificado';
    const orderDep = chat.province || 'No especificado';
    const orderRef = chat.references || 'No especificadas';

    chat.assignedProduct = productList; // <--- FIX: Ensure product is always available for webhooks

    const isComplete = orderName !== 'No especificado' && orderAddress !== 'No especificada' && orderCity !== 'No especificado' && orderDep !== 'No especificado';

    if (isComplete) {
        // --- AUTO-APROBACIÓN ---
        chat.tags = (chat.tags || []).filter(t => t !== 'soporte' && t !== 'interesado' && t !== 'pedido-pendiente' && t !== 'pedido');
        chat.tags.push('preparar_pedido');
        chat.updatedAt = Date.now();
        saveChats(chats);
        io.emit('tag_updated', { from: to, tags: chat.tags });

        console.log(`📦 [AUTO-APROBADO] Pedido de ${chat.customerName}: ${productList}. Creando en Shopify...`);
        
        try {
            const shopifyRes = await createShopifyOrder(chat, productList);
            
            if (shopifyRes.success) {
                chat.orderRegistered = true;
                chat.assignedProduct = productList; // <--- FIX: Ensure product is available for webhook
                saveChats(chats);
                
                const notif = `✅ *PEDIDO AUTO-APROBADO Y ENVIADO A DROPI*\n\n👤 *Nombre:* ${orderName}\n📱 *Teléfono:* ${orderPhone}\n📍 *Dirección:* ${orderAddress}\n🔖 *Referencias:* ${orderRef}\n🏙️ *Municipio:* ${orderCity}\n🗺️ *Depto:* ${orderDep}\n🛒 *Producto:* ${productList}\n\n📦 *Pedido Dropi:* ${shopifyRes.orderName}`;
                notifyAdmins(chat, notif);
                
                smartSendMessage(to, `✅ ¡Tu pedido ${shopifyRes.orderName} ha sido confirmado y pronto será despachado!`);
                
                const now = new Date();
                const saleData = extractSaleData(to, productList);
                sales.push({
                    id: 'sale-' + Date.now(),
                    reference: shopifyRes.orderName,
                    service: productList,
                    price: saleData.price,
                    country: saleData.country,
                    currency: saleData.currency,
                    date: now.toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' }),
                    customer: chat.customerName,
                    customerId: to,
                    paid: false
                });
                saveSales(sales);
                io.emit('sales_updated', sales);
            } else {
                const errorNotif = `⚠️ *ERROR CREANDO PEDIDO EN DROPI*\n\n👤 *Nombre:* ${orderName}\n📱 *Teléfono:* ${orderPhone}\n📍 *Dirección:* ${orderAddress}\n🏙️ *Municipio:* ${orderCity}\n🗺️ *Depto:* ${orderDep}\n🛒 *Producto:* ${productList}\n\n❌ *Error:* ${shopifyRes.error}`;
                notifyAdmins(chat, errorNotif);
            }
        } catch (error) {
            console.error('Error in auto-approve flow:', error);
            notifyAdmins(chat, `❌ Ocurrió un error inesperado al intentar crear el pedido en Dropi para ${orderName}.`);
        }
        return;
    }

    // --- APROBACIÓN MANUAL ---
    // Marcar el pedido en el chat como pendiente de aprobación
    if (!chat.tags?.includes('pedido-pendiente')) {
        chat.tags = [...(chat.tags || []).filter(t => t !== 'soporte' && t !== 'pedido'), 'pedido-pendiente'];
    }
    chat.pendingApprovalProducts = productList;
    chat.updatedAt = Date.now();
    saveChats(chats);
    io.emit('tag_updated', { from: to, tags: chat.tags });

    // Notificar al admin por WhatsApp para aprobación manual
    const title = '⚠️ *NUEVO PEDIDO (Falta Info)*';
    const notif = `${title}\n\n👤 *Nombre:* ${orderName}\n📱 *Teléfono:* ${orderPhone}\n📍 *Dirección:* ${orderAddress}\n🔖 *Referencias:* ${orderRef}\n🏙️ *Municipio:* ${orderCity}\n🗺️ *Depto:* ${orderDep}\n🛒 *Producto:* ${productList}\n\n👉 *Aprobar:* Responde APROBAR ${to}\n👉 *Cancelar:* Responde RECHAZAR ${to}`;
    notifyAdmins(chat, notif);

    console.log(`📦 [PEDIDO PENDIENTE] Pedido de ${chat.customerName}: ${productList}. Esperando aprobación del admin (faltan datos).`);
}

// --- SHOPIFY INTEGRATION ---
async function createShopifyOrder(chat, products) {
    let waLine = '1';
    if (chat.from && chat.from.includes('_')) {
        waLine = chat.from.split('_')[1];
    }

    let SHOPIFY_URL = null;
    let SHOPIFY_TOKEN = null;
    let PRODUCT_ID = null;
    let countryISO = 'GT';

    // Si es Chile (Línea 2)
    if (waLine === '2') {
        countryISO = 'CL';
    }

    // Si es Honduras (Línea 3)
    if (waLine === '3') {
        countryISO = 'HN';
    }

    // SOBRESCRIBIR con credenciales específicas del producto si existen
    const prod = knowledgeBaseDb.find(p => p.name === chat.assignedProduct);
    let targetPricesText = '';
    
    if (prod) {
        targetPricesText = prod.prices || '';
        const cleanFrom = (chat.from || '').replace(/\D/g, '');
        const cleanOrderPhone = chat.orderPhone ? String(chat.orderPhone).replace(/\D/g, '') : '';
        const detectPhone = cleanOrderPhone.length > 8 ? cleanOrderPhone : cleanFrom;
        
        // Inferir el país por el prefijo del cliente o del teléfono de la orden
        if (detectPhone.startsWith('504')) countryISO = 'HN';
        else if (detectPhone.startsWith('503')) countryISO = 'SV';
        else if (detectPhone.startsWith('506')) countryISO = 'CR';
        else if (detectPhone.startsWith('56')) countryISO = 'CL';
        else if (detectPhone.startsWith('57')) countryISO = 'CO';
        else countryISO = 'GT'; // Fallback
        
        let targetStoreId = prod.defaultStoreId;
        let targetProductId = prod.defaultShopifyProductId || prod.shopifyProductId;
        
        if (prod.priceVariations) {
            const variation = prod.priceVariations.find(v => v.prefix && detectPhone.startsWith(v.prefix.replace(/\D/g, '')));
            if (variation) {
                if (variation.prices) targetPricesText = variation.prices;
                if (variation.storeId) targetStoreId = variation.storeId;
                if (variation.shopifyProductId) targetProductId = variation.shopifyProductId;
            }
        }
        
        if (targetStoreId) {
            const store = storesDb.find(s => s.id === targetStoreId);
            if (store) {
                SHOPIFY_URL = store.shopifyStoreUrl;
                SHOPIFY_TOKEN = store.shopifyAccessToken;
                PRODUCT_ID = targetProductId || PRODUCT_ID;
            }
        } else if (prod.shopifyStoreUrl && prod.shopifyAccessToken) {
            // Soporte de compatibilidad hacia atrás
            SHOPIFY_URL = prod.shopifyStoreUrl;
            SHOPIFY_TOKEN = prod.shopifyAccessToken;
            PRODUCT_ID = prod.shopifyProductId || PRODUCT_ID;
        }
    }

    if (!SHOPIFY_URL || !SHOPIFY_TOKEN) {
        console.log(`ℹ️ [Shopify Skip] El producto "${chat.assignedProduct || products}" no tiene tienda configurada en la Base de Conocimiento. Omitiendo carga.`);
        return { success: false, error: 'Credenciales Shopify no configuradas o producto sin tienda asignada.' };
    }

    try {
        const cleanUrl = SHOPIFY_URL.replace(/^https?:\/\//, '').replace(/\/$/, '').trim();
        const cleanToken = SHOPIFY_TOKEN.trim();
        
        // Extraer la cantidad del texto del producto (ej: "Combo 2 Frascos")
        let orderQty = 1;
        if (/(2\s*(frasco|tarro|unidad|combo|x)|x\s*2)/i.test(products)) orderQty = 2;
        else if (/(3\s*(frasco|tarro|unidad|combo|x)|x\s*3)/i.test(products)) orderQty = 3;
        else if (/(4\s*(frasco|tarro|unidad|combo|x)|x\s*4)/i.test(products)) orderQty = 4;
        else if (/(5\s*(frasco|tarro|unidad|combo|x)|x\s*5)/i.test(products)) orderQty = 5;

        // Calcular precio unitario dinámicamente desde el texto de la KB
        let unitPriceVal = 155.00; // fallback estricto en caso de que todo falle
        
        if (targetPricesText) {
            const lines = targetPricesText.split('\n');
            let foundPrice = null;
            
            // Buscar línea que coincida con la cantidad
            for (const line of lines) {
                if (
                    new RegExp(`^[^0-9]*${orderQty}\\s*[^0-9]`, 'i').test(line) || 
                    new RegExp(`Combo ${orderQty}`, 'i').test(line)
                ) {
                    const match = line.match(/(?:Q|L|\$|₡)\s*([0-9.,]+)/i);
                    if (match) {
                        foundPrice = parseFloat(match[1].replace(/,/g, ''));
                        break;
                    }
                }
            }
            
            // Fallback si no encontró la línea exacta pero ordenó 1
            if (foundPrice === null && orderQty === 1) {
                const match = targetPricesText.match(/(?:Q|L|\$|₡)\s*([0-9.,]+)/i);
                if (match) foundPrice = parseFloat(match[1].replace(/,/g, ''));
            }
            
            // Si encontró el precio total para el combo, dividirlo entre orderQty
            if (foundPrice !== null && !isNaN(foundPrice)) {
                unitPriceVal = foundPrice / orderQty;
            }
        }
        
        const unitPrice = unitPriceVal.toFixed(2);

        // Resolver el Variant ID a partir del Product ID
        let targetVariantId = null;
        
        try {
            const prodRes = await fetch(`https://${cleanUrl}/admin/api/2024-01/products/${PRODUCT_ID}.json`, {
                headers: { 'X-Shopify-Access-Token': cleanToken }
            });
            const prodData = await prodRes.json();
            if (prodData.product && prodData.product.variants && prodData.product.variants.length > 0) {
                targetVariantId = prodData.product.variants[0].id;
            } else {
                console.error("No se pudo obtener la variante del producto:", prodData);
            }
        } catch (e) {
            console.error("Error consultando producto Shopify:", e);
        }

        let lineItem = {};
        if (targetVariantId) {
            lineItem = {
                variant_id: targetVariantId,
                quantity: orderQty,
                price: unitPrice
            };
        } else {
            lineItem = {
                title: products, // Fallback
                price: unitPrice,
                quantity: orderQty,
                requires_shipping: true
            };
        }

        const fullName = chat.orderName || chat.customerName || 'Cliente WhatsApp';
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0] || 'Cliente';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '.';

        let finalPhone = chat.orderPhone ? String(chat.orderPhone).replace(/\D/g, '') : chat.from.replace(/\D/g, '');
        
        // Estandarizar prefijo de país
        if (countryISO === 'GT' && !finalPhone.startsWith('502')) {
            finalPhone = '502' + finalPhone;
        } else if (countryISO === 'HN' && !finalPhone.startsWith('504')) {
            finalPhone = '504' + finalPhone;
        } else if (countryISO === 'CL' && !finalPhone.startsWith('56')) {
            finalPhone = '56' + finalPhone;
        }
        finalPhone = '+' + finalPhone;

        const defaultProvince = countryISO === 'GT' ? 'Guatemala' : (countryISO === 'HN' ? 'Francisco Morazán' : 'Región Metropolitana');
        const provinceVal = chat.province || defaultProvince;

        const isHN = countryISO === 'HN';
        const finalZip = isHN ? '' : '00000';
        const addr2 = chat.references ? (isHN ? `${chat.references} - Depto: ${provinceVal}` : chat.references) : (isHN ? `Depto: ${provinceVal}` : '');

        const orderData = {
            order: {
                line_items: [ lineItem ],
                shipping_address: {
                    first_name: firstName,
                    last_name: lastName,
                    address1: chat.address || 'Pendiente de confirmar',
                    address2: addr2,
                    city: chat.city || 'Ciudad',
                    province: provinceVal,
                    zip: finalZip,
                    country: countryISO,
                    phone: finalPhone
                },
                billing_address: {
                    first_name: firstName,
                    last_name: lastName,
                    address1: chat.address || 'Pendiente de confirmar',
                    address2: addr2,
                    city: chat.city || 'Ciudad',
                    province: provinceVal,
                    zip: finalZip,
                    country: countryISO,
                    phone: finalPhone
                },
                note: `Pedido vía WhatsApp Bot.\nTeléfono Original: ${chat.orderPhone || chat.from}\nDepto Detectado: ${provinceVal}\nReferencias: ${chat.references || 'No especificadas'}`,
                tags: 'whatsapp-bot, contraentrega',
                financial_status: 'pending',
                gateway: "Cash on Delivery (COD)",
                payment_gateway_names: ["Cash on Delivery (COD)"],
                processing_method: "manual"
            }
        };

        const response = await fetch(`https://${cleanUrl}/admin/api/2024-01/orders.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': cleanToken
            },
            body: JSON.stringify(orderData)
        });

        const data = await response.json();
        if (response.ok && data.order) {
            // AUTOMATIZAR SOLICITUD DE PREPARACIÓN A DROPI (Fulfillment Request)
            try {
                const fOrderRes = await fetch(`https://${cleanUrl}/admin/api/2024-01/orders/${data.order.id}/fulfillment_orders.json`, {
                    headers: { 'X-Shopify-Access-Token': cleanToken }
                });
                const fOrderData = await fOrderRes.json();
                
                if (fOrderData.fulfillment_orders && fOrderData.fulfillment_orders.length > 0) {
                    const fulfillmentOrderId = fOrderData.fulfillment_orders[0].id;
                    const requestRes = await fetch(`https://${cleanUrl}/admin/api/2024-01/fulfillment_orders/${fulfillmentOrderId}/fulfillment_request.json`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Shopify-Access-Token': cleanToken
                        },
                        body: JSON.stringify({
                            fulfillment_request: { message: "Pedido generado automáticamente por el Chatbot." }
                        })
                    });
                    
                    if (requestRes.ok) {
                        console.log(`✅ Solicitud de preparación enviada a Dropi para orden ${data.order.name}`);
                    } else {
                        console.error('❌ Error enviando solicitud a Dropi:', await requestRes.json());
                    }
                }
            } catch (err) {
                console.error('❌ Excepción pidiendo Fulfillment a Dropi:', err);
            }

            return { success: true, orderId: data.order.id, orderName: data.order.name };
        } else {
            console.error('❌ Error Shopify Order:', data);
            return { success: false, error: JSON.stringify(data) };
        }
    } catch (e) {
        console.error('❌ Excepción Shopify:', e);
        return { success: false, error: e.message };
    }
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
        const cleanWebhookId = webhookPhoneId ? String(webhookPhoneId).trim() : '';
        const waLine = cleanWebhookId === PHONE_ID_3 ? 3 : (cleanWebhookId === PHONE_ID_2 ? 2 : 1);
        const recipientId = waLine > 1 ? `${originalRecipientId}_${waLine}` : originalRecipientId;
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
        const cleanWebhookId = webhookPhoneId ? String(webhookPhoneId).trim() : '';
        
        console.log(`[DEBUG] Webhook received from Phone ID: '${cleanWebhookId}' | Known Line 1: '${PHONE_ID}' | Line 2: '${PHONE_ID_2}' | Line 3: '${PHONE_ID_3}'`);

        const waLine = cleanWebhookId === PHONE_ID_3 ? 3 : (cleanWebhookId === PHONE_ID_2 ? 2 : 1);
        const from = waLine > 1 ? `${originalFrom}_${waLine}` : originalFrom;
        
        // Descarte de mensajes reales para bloqueo estricto (WhatsApp)
        if (chats[from]?.isBlocked) {
            console.log(`🔒 [BLOQUEO] Mensaje entrante de WhatsApp ${from} descartado porque el contacto está bloqueado.`);
            res.sendStatus(200);
            return;
        }

        const contacts = body.entry[0].changes[0].value.contacts;
        const customerName = contacts?.[0]?.profile?.name || from;

        // Guardar cliente en Remarketing DB
        if (from !== ADMIN_PHONE && !customersDb.some(c => c.phone === from)) {
            customersDb.push({ phone: from, name: customerName, firstSeen: Date.now() });
            saveCustomers(customersDb);
        }

        // Comandos Admin (Shopify Approval)
        const isSenderAdmin = from === ADMIN_PHONE || knowledgeBaseDb.some(p => p.adminPhone && p.adminPhone.trim() === from);
        if (isSenderAdmin && msg.type === 'text') {
            const adminText = msg.text.body.trim();
            const match = adminText.match(/^(APROBAR|RECHAZAR)\s+([\d_]+)$/i);
            if (match) {
                const action = match[1].toUpperCase();
                const targetPhone = match[2];
                const targetChat = chats[targetPhone];

                if (!targetChat) {
                    smartSendMessage(from, '❌ Chat no encontrado.');
                    res.sendStatus(200); return;
                }

                if (action === 'APROBAR') {
                    // Validar que los datos mínimos existan para Dropi
                    if (!targetChat.orderName || !targetChat.address || !targetChat.city || !targetChat.province) {
                        smartSendMessage(from, '❌ *Error de Aprobación:* No se puede aprobar el pedido porque faltan datos esenciales (Nombre, Dirección, Municipio o Departamento). Por favor, pídele los datos faltantes al cliente antes de aprobar.');
                        res.sendStatus(200); return;
                    }

                    smartSendMessage(from, '⏳ Creando pedido en Shopify...');
                    const shopifyRes = await createShopifyOrder(targetChat, targetChat.pendingApprovalProducts || 'Producto');
                    
                    if (shopifyRes.success) {
                        targetChat.tags = (targetChat.tags || []).filter(t => t !== 'pedido-pendiente' && t !== 'interesado' && t !== 'pedido');
                        targetChat.tags.push('preparar_pedido');
                        targetChat.orderRegistered = true;
                        delete targetChat.pendingApprovalProducts;
                        saveChats(chats);
                        io.emit('tag_updated', { from: targetPhone, tags: targetChat.tags });
                        
                        smartSendMessage(from, `✅ Pedido ${shopifyRes.orderName} creado en Shopify exitosamente.`);
                        smartSendMessage(targetPhone, `✅ ¡Tu pedido ${shopifyRes.orderName} ha sido confirmado y pronto será despachado!`);
                        
                        // Guardar en sales para compatibilidad con el frontend antiguo
                        const now = new Date();
                        const saleProduct = targetChat.pendingApprovalProducts || 'Producto';
                        const saleData = extractSaleData(targetPhone, saleProduct);
                        sales.push({
                            id: 'sale-' + Date.now(),
                            reference: shopifyRes.orderName,
                            service: saleProduct,
                            price: saleData.price,
                            country: saleData.country,
                            currency: saleData.currency,
                            date: now.toLocaleDateString('en-CA', { timeZone: 'America/Guatemala' }),
                            customer: targetChat.customerName,
                            customerId: targetPhone,
                            paid: false
                        });
                        saveSales(sales);
                        io.emit('sales_updated', sales);
                    } else {
                        smartSendMessage(from, `❌ Error en Shopify: ${shopifyRes.error}`);
                    }
                } else if (action === 'RECHAZAR') {
                    targetChat.tags = (targetChat.tags || []).filter(t => t !== 'pedido-pendiente');
                    delete targetChat.pendingApprovalProducts;
                    saveChats(chats);
                    io.emit('tag_updated', { from: targetPhone, tags: targetChat.tags });
                    smartSendMessage(from, '❌ Pedido rechazado.');
                    smartSendMessage(targetPhone, '❌ Lo sentimos, no pudimos procesar tu pedido. Comunícate con soporte.');
                }
                res.sendStatus(200); return;
            }
        }


        // Mensajes de Clientes
        // Manejo de Multimedia (Imágenes, Stickers, Documentos)
        let mediaUrl = null;
        let msgBody = '';
        
        switch (msg.type) {
            case 'text':
                msgBody = msg.text?.body || '';
                break;
            case 'image':
                msgBody = '[FOTO]';
                break;
            case 'sticker':
                msgBody = '[STICKER]';
                break;
            case 'document':
                msgBody = `[DOCUMENTO: ${msg.document?.filename || 'archivo'}]`;
                break;
            case 'audio':
            case 'voice':
                msgBody = '[AUDIO]';
                break;
            case 'video':
                msgBody = '[VIDEO]';
                break;
            case 'contacts':
                msgBody = '[CONTACTOS]';
                break;
            case 'location':
                msgBody = '[UBICACIÓN]';
                break;
            case 'reaction':
                msgBody = `[REACCIÓN: ${msg.reaction?.emoji || ''}]`;
                break;
            default:
                msgBody = `[${(msg.type || 'ARCHIVO').toUpperCase()}]`;
        }

        // Extraer datos del anuncio (Click-to-WhatsApp Ads)
        if (msg.referral) {
            const adInfo = msg.referral.headline || msg.referral.body || 'Facebook/Instagram';
            const adId = msg.referral.source_id ? ` (ID: ${msg.referral.source_id})` : '';
            const adUrl = msg.referral.source_url ? `\n🔗 Link: ${msg.referral.source_url}` : '';
            msgBody = `📢 [Anuncio: ${adInfo}${adId}]${adUrl}\n\n${msgBody}`;
        }

        if (msgBody) {
            const isNewChat = !chats[from];
            if (!chats[from]) chats[from] = { from, customerName, messages: [] };
            const currentChat = chats[from];
            
            // DEDUPLICACIÓN DE WEBHOOKS: Ignorar si el mensaje ya fue procesado
            if (msg.id && currentChat.messages.some(m => m.wamid === msg.id || m.id === msg.id)) {
                console.log(`♻️ [DEDUPLICACIÓN] Mensaje ${msg.id} de ${from} ya fue procesado. Ignorando.`);
                res.sendStatus(200);
                return;
            }

            // Multi-Línea: Detectar de qué número de WhatsApp viene el mensaje
            const webhookPhoneId = body.entry[0].changes[0].value.metadata?.phone_number_id;
            const cleanWebhookId = webhookPhoneId ? String(webhookPhoneId).trim() : '';
            if (cleanWebhookId === PHONE_ID_3) {
                currentChat.waLine = 3;
            } else if (cleanWebhookId === PHONE_ID_2) {
                currentChat.waLine = 2;
            } else if (!currentChat.waLine) {
                currentChat.waLine = 1;
            }

            const adIdMatch = msg.referral?.source_id ? msg.referral.source_id : null;
            assignProductToChat(currentChat, msgBody, adIdMatch, currentChat.waLine, from);

            triggerWelcomeAudioIfNeeded(from, isNewChat);
            
            // Descarga de Multimedia
            if (['image', 'sticker', 'document', 'audio', 'voice', 'video'].includes(msg.type)) {
                const mediaData = msg[msg.type];
                const mediaId = mediaData?.id;
                
                if (mediaId) {
                    console.log(`📥 ${msg.type.toUpperCase()} recibido de ${customerName}. Descargando...`);
                    try {
                        const buffer = await downloadMetaMedia(mediaId, from);
                        if (buffer) {
                            let ext = 'file';
                            if (msg.type === 'document') ext = msg.document?.filename?.split('.').pop() || 'pdf';
                            else if (msg.type === 'image') ext = 'jpg';
                            else if (msg.type === 'sticker') ext = 'webp';
                            else if (msg.type === 'audio' || msg.type === 'voice') ext = 'ogg';
                            else if (msg.type === 'video') ext = 'mp4';

                            const fileName = `${Date.now()}-${from}.${ext}`;
                            const filePath = path.join(UPLOADS_DIR, fileName);
                            fs.writeFileSync(filePath, buffer);
                            mediaUrl = `/uploads/${fileName}`;
                        
                        // APAGAR IA AL RECIBIR FOTO (A petición del usuario)
                        if (msg.type === 'image') {
                            currentChat.aiDisabled = true;
                            currentChat.tags = [...(currentChat.tags || []).filter(t => t !== 'soporte'), 'soporte'];
                            
                            io.emit('tag_updated', { from, tags: currentChat.tags });
                            io.emit('ai_state_updated', { chatId: from, disabled: true });
                            
                            notifyAdmins(chats[from], `⚠️ *SOPORTE REQUERIDO* por *${customerName}*. El cliente ha enviado una foto/imagen.`, 'support');
                            registerAnomaly('Soporte Requerido (Imagen)', customerName, from);
                            
                            if (aiTimers[from]) {
                                clearTimeout(aiTimers[from]);
                                delete aiTimers[from];
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
            }

            const messageMediaId = msg.type !== 'text' ? msg[msg.type]?.id : null;
            const newMessage = { 
                id: msg.id, 
                mediaId: messageMediaId,
                from, 
                body: msgBody, content: msgBody, 
                imageUrl: (msg.type === 'image' || msg.type === 'sticker') 
                    ? (mediaUrl || (messageMediaId ? `/api/media/${messageMediaId}` : null)) 
                    : null,
                fileUrl: (msg.type === 'document' || msg.type === 'audio' || msg.type === 'voice' || msg.type === 'video') 
                    ? (mediaUrl || (messageMediaId ? `/api/media/${messageMediaId}` : null)) 
                    : null,
                timestampRaw: Date.now(), role: 'user' 
            };
            
            // --- MANEJO DE AUDIO (Whisper) ---
            if ((msg.type === 'audio' || msg.type === 'voice') && newMessage.fileUrl) {
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

        notifyAdmins(refreshedChat, `⚠️ *SOPORTE REQUERIDO* por *${customerName}*. La IA se ha apagado para este chat.`, 'support');
        
        delete aiTimers[from];
        return;
    }

    // Respuesta IA
    const allMessages = refreshedChat.messages.slice(-15);
    
    // Contexto de pedido registrado
    if (refreshedChat.orderRegistered) {
        allMessages.push({ role: 'system', content: 'CONTEXTO ESTRICTO: El cliente YA CONFIRMÓ su pedido exitosamente en el pasado. Si hace preguntas post-venta sobre DOSIS o USO, respóndelas amablemente. Si el cliente simplemente agradece ("gracias"), se despide, envía un emoji o dice que "no" tiene más dudas, RESPÓNDE CORTÉS Y BREVEMENTE (ej: "¡Gracias a ti! Que tengas un excelente día."). NUNCA uses [APAGAR_BOT_SOPORTE] por un simple agradecimiento o despedida. PERO si pregunta por el ESTADO DE SU ENVÍO, NÚMERO DE GUÍA, RASTREO, o reporta un problema grave / retraso, DEBES OBLIGATORIAMENTE responder ÚNICAMENTE con la etiqueta literal [APAGAR_BOT_SOPORTE] y NADA MÁS. Si pregunta cuánto tarda en llegar, respóndele "1 a 2 días hábiles".' });
    }
    
    // Pasar información de análisis de imagen si existe
    if (refreshedChat.lastImageAnalysis) {
        allMessages.push({ role: 'system', content: `CONTEXTO VISUAL: La última imagen enviada por el usuario fue analizada como: "${refreshedChat.lastImageAnalysis}".` });
        delete refreshedChat.lastImageAnalysis;
        saveChats(chats);
    }

    const aiReply = await getAIResponse(msgBodyLower, allMessages, refreshedChat.waLine, from);
    
    // --- APAGADO POR IA ---
    if (/\[APAGAR_BOT_SOPORTE\]/i.test(aiReply)) {
        const hasPartialData = refreshedChat.orderName || refreshedChat.address || refreshedChat.city || refreshedChat.orderPhone;
        let newTag = hasPartialData ? 'pedidos_abandonados' : 'soporte';
        let alertMsg = hasPartialData ? `⚠️ *PEDIDO ABANDONADO / INCOMPLETO* por *${customerName}*. La IA pasó a modo silencioso antes de cerrar la venta.` : `⚠️ *SOPORTE REQUERIDO* por *${customerName}* (Detectado por IA). La IA está en modo silencioso.`;

        if (!refreshedChat.tags) refreshedChat.tags = [];
        refreshedChat.tags = refreshedChat.tags.filter(t => t !== 'soporte' && t !== 'pedidos_abandonados');
        refreshedChat.tags.push(newTag);

        saveChats(chats);
        io.emit('tag_updated', { from, tags: refreshedChat.tags });

        notifyAdmins(refreshedChat, alertMsg, 'support');
        registerAnomaly(hasPartialData ? 'Pedido Abandonado' : 'Soporte Requerido', customerName, from);
        delete aiTimers[from];
        return;
    }

    let cleanAiReply = aiReply;

    // --- ENVÍO DE FOTO AUTOMÁTICA ---
    const hasFotoTag = /\[ENVIAR_FOTO\]/i.test(aiReply);
    if (hasFotoTag) {
        if (refreshedChat.assignedProduct) {
            const prod = knowledgeBaseDb.find(p => p.name === refreshedChat.assignedProduct);
            if (prod && prod.imageUrl) {
                await smartSendImage(from, prod.imageUrl, "", null);
                refreshedChat.messages.push({
                    role: 'assistant',
                    isMe: true,
                    body: '[FOTO ENVIADA AL CLIENTE]'
                });
                cleanAiReply = cleanAiReply.replace(/\[ENVIAR_FOTO\]/gi, '').trim();
                saveChats(chats);
            }
        }
    }

    // --- REGISTRO DE PEDIDO ---
    const hasOrderTag = /\[ENTREGAR_AHORA\]/i.test(cleanAiReply);
    const prodsMatch = cleanAiReply.match(/\[PRODUCTOS:(.+?)\]/i);
    
    if (hasOrderTag && prodsMatch) {
        const products = prodsMatch[1].trim();
        
        const nameMatch = cleanAiReply.match(/\[NOMBRE:?\s*([^\]]+)\]/i);
        const phoneMatch = cleanAiReply.match(/\[TELEFONO:?\s*([^\]]+)\]/i);
        const dirMatch = cleanAiReply.match(/\[DIRECCION:?\s*([^\]]+)\]/i);
        const munMatch = cleanAiReply.match(/\[MUNICIPIO:?\s*([^\]]+)\]/i);
        const depMatch = cleanAiReply.match(/\[DEPARTAMENTO:?\s*([^\]]+)\]/i);
        const refMatch = cleanAiReply.match(/\[REFERENCIAS:?\s*([^\]]+)\]/i);
        
        const cleanVal = (val) => val && !/no proporcionad[oa]/i.test(val) && !/no especificad[oa]/i.test(val) ? val.trim() : null;

        if (nameMatch) refreshedChat.orderName = cleanVal(nameMatch[1]) || refreshedChat.orderName;
        if (phoneMatch) refreshedChat.orderPhone = cleanVal(phoneMatch[1]) || refreshedChat.orderPhone;
        if (dirMatch) refreshedChat.address = cleanVal(dirMatch[1]) || refreshedChat.address;
        if (munMatch) refreshedChat.city = cleanVal(munMatch[1]) || refreshedChat.city;
        if (depMatch) refreshedChat.province = cleanVal(depMatch[1]) || refreshedChat.province;
        if (refMatch) refreshedChat.references = cleanVal(refMatch[1]) || refreshedChat.references;
        
        // Autodetectar el número de teléfono desde el ID de WhatsApp si la IA no lo extrajo o no se lo dieron
        if (!refreshedChat.orderPhone) {
            refreshedChat.orderPhone = from.split('@')[0].split('_')[0];
        }
        
        // Extraer Interés temprano del producto/combo
        const interesRegex = /\[INTERES:\s*([^\]]+)\]/i;
        const intMatch = aiReply.match(interesRegex);
        if (intMatch) {
            refreshedChat.pendingApprovalProducts = cleanVal(intMatch[1]);
            aiReply = aiReply.replace(interesRegex, '').trim();
            cleanAiReply = cleanAiReply.replace(interesRegex, '').trim();
        }

        const isComplete = refreshedChat.orderName && refreshedChat.address && refreshedChat.city && refreshedChat.province;
        
        io.emit('chat_meta_updated', { id: from, chat: refreshedChat });
        saveChats(chats);
        
        // Evitar spam: Solo notificar si no se ha marcado como registrado definitivamente
        if (!refreshedChat.orderRegistered) {
            await registerOrder(from, products);
            if (isComplete) {
                refreshedChat.orderRegistered = true;
                
                // Auto-etiquetado Kanban: Pasar a Preparar Pedido
                refreshedChat.tags = ['preparar_pedido'];
                io.emit('tag_updated', { from, tags: refreshedChat.tags });
                
                saveChats(chats);
            }
        }
    } else {
        // Etiquetas detectadas por la IA
        const isInteresado = /\[INTERESADO\]/i.test(cleanAiReply);
        const isAbandonado = /\[ABANDONADO\]/i.test(cleanAiReply);
        
        let newTags = [...(refreshedChat.tags || [])];
        let changed = false;

        if (isInteresado && !newTags.includes('interesado')) {
            newTags = newTags.filter(t => t !== 'activo');
            newTags.push('interesado');
            changed = true;
        }

        if (isAbandonado && !newTags.includes('pedidos_abandonados')) {
            newTags = newTags.filter(t => t !== 'interesado' && t !== 'preparar_pedido' && t !== 'pedido-pendiente');
            newTags.push('pedidos_abandonados');
            changed = true;
            notifyAdmins(chat, `⚠️ *ANOMALÍA: PEDIDO ABANDONADO*\n\nEl cliente *${customerName}* parece haber abandonado el proceso de compra o la IA se ha atascado. Revisa la conversación.`, 'support');
            
            // Register anomaly
            registerAnomaly('Pedido Abandonado', customerName, from);
        }

        if (changed) {
            refreshedChat.tags = newTags;
            saveChats(chats);
            io.emit('tag_updated', { from, tags: refreshedChat.tags });
        }
    }

    // Limpiar etiquetas internas antes de enviar al cliente
    const cleanReply = cleanAiReply.replace(/\s*\[(PAGO_PENDIENTE|PRODUCTOS|TOTAL|ENTREGAR_AHORA|APAGAR_BOT_SOPORTE|NOMBRE|TELEFONO|DIRECCION|REFERENCIAS|MUNICIPIO|DEPARTAMENTO|ENVIAR_FOTO|INTERESADO|ABANDONADO)[^\]]*\]\s*/gi, ' ').trim();
    
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

        processAIResponse(from, msgBodyLower).catch(err => {
            console.error('❌ [CRITICAL ERROR] Excepción no controlada en processAIResponse:', err);
        });
    }, 2500);
}

// Nueva función de envío unificada
async function smartSendMessage(to, text, forceLine = null) {
    const chat = chats[to];
    const platform = chat?.platform || 'whatsapp';

    if (platform === 'messenger') {
        return sendMessageToMessengerAPI(to, text);
    } else {
        return sendMessageToCloudAPI(to, text, forceLine);
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
    let waToken = WHATSAPP_TOKEN;
    if (customerPhone && chats[customerPhone]) {
        if (chats[customerPhone].waLine === 3 && WHATSAPP_TOKEN_3) waToken = WHATSAPP_TOKEN_3;
        else if (chats[customerPhone].waLine === 2 && WHATSAPP_TOKEN_2) waToken = WHATSAPP_TOKEN_2;
    }
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

app.get('/api/anomalies', (req, res) => res.json(anomalies));
app.post('/api/anomalies/:id/resolve', (req, res) => {
    const anomaly = anomalies.find(a => a.id === req.params.id);
    if (anomaly) {
        anomaly.resolved = true;
        saveAnomalies(anomalies);
        io.emit('anomalies_updated', anomalies);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

app.get('/api/sales', (req, res) => res.json(sales));
app.post('/api/sales', (req, res) => { sales = req.body; saveSales(sales); io.emit('sales_updated', sales); res.json({success:true}); });
app.get('/api/platforms', (req, res) => res.json(platforms));
app.post('/api/platforms', (req, res) => { platforms = req.body; savePlatforms(platforms); io.emit('platforms_updated', platforms); res.json({success:true}); });
app.get('/api/providers', (req, res) => res.json(providers));
app.post('/api/providers', (req, res) => { providers = req.body; saveProviders(providers); io.emit('providers_updated', providers); res.json({success:true}); });

app.get('/api/settings', (req, res) => res.json(settings));
app.get('/api/chats', (req, res) => {
    // Para evitar cuellos de botella en Socket.io con bases de datos grandes,
    // el frontend descarga el payload inicial mediante HTTP GET
    res.json(getOptimizedChatsPayload());
});
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

app.post('/api/send-message', async (req, res) => {
    try {
        const { to, content, imageUrl, origin } = req.body;
        if (content && /^r$/i.test(content.trim())) { 
            return res.status(200).json({ success: true, message: 'r command disabled' });
        }
        
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
        if (!chats[to]) { chats[to] = { from: to, messages: [], unreadCount: 0, profileName: 'Desconocido' }; }
        chats[to].messages.push(m);
        saveChats(chats);
        io.emit('chat_updated', chats[to]);
        res.json({ success: true });
    } catch (e) {
        console.error("Error sending message via API", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/scan-chats', async (req, res) => {
    const { timeframe } = req.body;
    let start, end;
    const now = new Date();
    
    if (timeframe === 'hoy') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        end = now.getTime();
    } else if (timeframe === 'ayer') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - 1;
    } else {
        return res.status(400).json({ success: false, error: 'Timeframe inválido' });
    }

    const targetTags = ['preparar_pedido', 'pedido', 'guia_enviada', 'viajando_destino', 'en_ruta', 'entregado'];
    let suspiciousChats = [];
    let alreadyRegistered = 0;

    for (const [phone, chat] of Object.entries(chats)) {
        const hasLogisticsTag = chat.tags && chat.tags.some(t => targetTags.includes(t));
        if (chat.updatedAt >= start && chat.updatedAt <= end) {
            if (hasLogisticsTag) {
                alreadyRegistered++;
            } else {
                const userMsgs = chat.messages ? chat.messages.filter(m => m.role === 'user') : [];
                if (userMsgs.length > 0) {
                    suspiciousChats.push({ phone, chat });
                }
            }
        }
    }

    let currentOpenai = openai;
    if (!currentOpenai && process.env.OPENAI_API_KEY) {
        const OpenAI = (await import('openai')).default;
        currentOpenai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    if (!currentOpenai) return res.status(500).json({ success: false, error: 'OpenAI no configurado' });

    let recoveredCount = 0;
    
    // Process in batches of 3
    for (let i = 0; i < suspiciousChats.length; i += 3) {
        const batch = suspiciousChats.slice(i, i + 3);
        await Promise.all(batch.map(async ({ phone, chat }) => {
            try {
                const contextMsgs = chat.messages.slice(-10).map(m => `${m.role === 'user' ? 'Cliente' : 'Bot'}: ${m.body || m.content}`).join('\n');
                const prompt = `Analiza la siguiente conversación con un cliente.\nDetermina si el cliente proporcionó sus datos de envío completos para confirmar una compra.\nDebes buscar: Nombre, Dirección, Municipio, Departamento/Provincia.\nResponde ÚNICAMENTE con un JSON válido en este formato exacto:\n{"isComplete": true, "datos": {"nombre": "...", "direccion": "...", "municipio": "...", "departamento": "..."}}\nSi faltan datos esenciales o el cliente no confirmó el pedido, isComplete debe ser false.\n\nConversación:\n${contextMsgs}`;

                const response = await currentOpenai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' }
                });

                const result = JSON.parse(response.choices[0].message.content);
                if (result.isComplete) {
                    chat.orderName = result.datos.nombre;
                    chat.address = result.datos.direccion;
                    chat.city = result.datos.municipio;
                    chat.province = result.datos.departamento;
                    
                    await registerOrder(phone, 'Producto rescatado por Auditoría');
                    recoveredCount++;
                }
            } catch (err) {
                console.error('❌ Error en Auditoría IA para', phone, err.message);
            }
        }));
    }

    res.json({ success: true, scanned: suspiciousChats.length, recovered: recoveredCount, total: alreadyRegistered + recoveredCount });
});

// Función para optimizar el payload de chats (rendimiento CRM)
function getOptimizedChatsPayload() {
    const optimized = {};
    
    // Sort chats by recent activity
    const chatEntries = Object.entries(chats).map(([id, data]) => {
        const messages = data.messages || [];
        const lastMsgTime = messages.length > 0 ? (Number(messages[messages.length - 1].timestampRaw) || 0) : 0;
        const activityTime = Math.max(Number(data.updatedAt) || 0, lastMsgTime);
        return { id, data, activityTime };
    });
    
    // Enviamos TODOS los chats para que funcionen las búsquedas de clientes viejos, 
    // pero limitamos los mensajes de CADA UNO para ahorrar memoria
    chatEntries.sort((a, b) => b.activityTime - a.activityTime);
    
    for (const { id, data } of chatEntries) {
        // Clonamos superficialmente para no afectar la DB
        optimized[id] = { ...data };
        // Truncamos mensajes a los últimos 30
        if (data.messages && data.messages.length > 30) {
            optimized[id].messages = data.messages.slice(-30);
        }
    }
    return optimized;
}

io.on('connection', (socket) => {
    socket.emit('inventory_updated', inventory);
    socket.emit('sales_updated', sales);
    socket.emit('initial_chats', getOptimizedChatsPayload());
    socket.emit('initial_settings', settings);
    socket.emit('platforms_updated', platforms);
    socket.emit('providers_updated', providers);
    socket.emit('campaigns_updated', campaigns);

    const getTrackingMessage = (customerName, trackingNumber) => {
        let trackingLink = '';
        const tnLower = trackingNumber.toLowerCase();
        if (tnLower.startsWith('fd')) {
            trackingLink = `\n\nPuedes rastrearlo aquí: https://rastreo.forzadelivery.com/`;
        } else if (tnLower.startsWith('gdt')) {
            trackingLink = `\n\nPuedes rastrearlo aquí: https://gt.gintracom.site/tracking`;
        }
        return `¡Hola ${customerName || ''}! Tu pedido ha sido despachado. Tu número de guía es: ${trackingNumber}${trackingLink}\n\nEstaremos atentos a la entrega.`;
    };

    socket.on('send_tracking_manual', async ({ chatId, trackingNumber }) => {
        if (!chats[chatId]) return;
        
        const chat = chats[chatId];
        chat.trackingNumber = trackingNumber;
        
        // Remove 'preparar_pedido' and add 'guia_enviada'
        chat.tags = (chat.tags || []).filter(t => t !== 'preparar_pedido');
        if (!chat.tags.includes('guia_enviada')) {
            chat.tags.push('guia_enviada');
        }
        
        saveChats(chats);
        io.emit('initial_chats', getOptimizedChatsPayload());

        // Send WhatsApp message
        const cName = chat.customerName || chat.orderName || chat.from.split('@')[0];
        const messageText = getTrackingMessage(cName, trackingNumber);
        try {
            const wamid = await smartSendMessage(chatId, messageText);
            const newMsg = {
                id: wamid || ('man-'+Date.now()),
                wamid: wamid || null,
                status: 'sent',
                from: chatId,
                body: messageText,
                content: messageText,
                isMe: true,
                role: 'bot',
                timestampRaw: Date.now(),
                timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
            };
            if (!chat.messages) chat.messages = [];
            chat.messages.push(newMsg);
            saveChats(chats);
            io.emit('message', { ...newMsg, waLine: chat.waLine });
        } catch (error) {
            console.error('Error sending manual tracking message to', chatId, error);
        }
    });

    socket.on('send_bulk_tracking', async ({ results }) => {
        for (const item of results) {
            if (!item.guia || (!item.telefono && !item.cliente)) continue;
            
            // Find chat
            let targetChatId = null;
            if (item.telefono) {
                const phoneStr = item.telefono.replace(/\D/g, '');
                targetChatId = Object.keys(chats).find(id => id.includes(phoneStr));
            }
            if (!targetChatId && item.cliente) {
                targetChatId = Object.keys(chats).find(id => {
                    const cName = chats[id].customerName || chats[id].orderName || '';
                    return cName.toLowerCase().includes(item.cliente.toLowerCase());
                });
            }

            if (targetChatId && chats[targetChatId]) {
                const chat = chats[targetChatId];
                chat.trackingNumber = item.guia;
                
                chat.tags = (chat.tags || []).filter(t => t !== 'preparar_pedido');
                if (!chat.tags.includes('guia_enviada')) {
                    chat.tags.push('guia_enviada');
                }
                
                const messageText = getTrackingMessage(chat.customerName || chat.orderName || item.cliente || chat.from.split('@')[0], item.guia);
                try {
                    const wamid = await smartSendMessage(targetChatId, messageText);
                    const newMsg = {
                        id: wamid || ('man-'+Date.now()),
                        wamid: wamid || null,
                        status: 'sent',
                        from: targetChatId,
                        body: messageText,
                        content: messageText,
                        isMe: true,
                        role: 'bot',
                        timestampRaw: Date.now(),
                        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                    };
                    if (!chat.messages) chat.messages = [];
                    chat.messages.push(newMsg);
                    io.emit('message', { ...newMsg, waLine: chat.waLine });
                } catch (error) {
                    console.error('Error in bulk tracking for', targetChatId, error);
                }
            }
        }
        saveChats(chats);
        io.emit('initial_chats', getOptimizedChatsPayload());
    });

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

    socket.on('test_ai', async (data, callback) => callback(await getAIResponse(data.content, data.history, data.waLine || 1, '')));
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
        
        // Auto-apagar IA si un humano responde manualmente
        if (!chats[to].aiDisabled) {
            chats[to].aiDisabled = true;
            io.emit('toggle_ai', { chatId: to, disabled: true });
            console.log(`🤖 [SISTEMA] IA apagada automáticamente porque el administrador envió un mensaje a ${to}`);
        }

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
        saveChats(chats); io.emit('message', { ...m, waLine: chats[to].waLine || 1 });
        scheduleRecovery(to);
    });
});

async function sendMessageToCloudAPI(to, text, forceLine = null) {
    const { token, phoneId, line } = getWhatsAppCredentials(to, forceLine);
    if (!token || !phoneId || !to) {
        if (chats[to]) {
            const errorMsg = {
                id: 'error-cred-' + Date.now(),
                isMe: true,
                body: `⚠️ ERROR DEL SISTEMA: Faltan credenciales (WHATSAPP_TOKEN_${chats[to].waLine} o PHONE_ID_${chats[to].waLine}). Ve a Railway y asegúrate de que existan y estén correctas.`,
                time: new Date().toLocaleTimeString('es-CO')
            };
            chats[to].messages.push(errorMsg);
            saveChats(chats);
            if (typeof io !== 'undefined') io.emit('message', { ...errorMsg, from: to, waLine: chats[to].waLine });
        }
        return null;
    }
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
            if (chats[to]) {
                const errorMsg = {
                    id: 'error-' + Date.now(),
                    isMe: true,
                    body: `⚠️ ERROR DEL SISTEMA: Meta rechazó el mensaje. Revisa tu WHATSAPP_TOKEN_3. Detalle: ${errData}`,
                    time: new Date().toLocaleTimeString('es-CO')
                };
                chats[to].messages.push(errorMsg);
                saveChats(chats);
                if (typeof io !== 'undefined') io.emit('message', { ...errorMsg, from: to, waLine: line });
            }
            return null;
        }
        const data = await res.json();
        return data.messages?.[0]?.id || null;
    } catch (err) { console.error('Meta send error:', err); return null; }
}

async function getAIResponse(message, history = [], waLine = 1, fromPhone = '') {
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
        // Formatear Base de Conocimiento filtrando por la línea de WhatsApp (o si es para Ambas)
        let knowledgeContext = "### BASE DE CONOCIMIENTO DE PRODUCTOS:\n";
        
        const lineProducts = knowledgeBaseDb.filter(p => {
            const pLine = p.line || '1'; // Si no tiene línea, pertenece a Línea 1 por defecto
            return pLine === String(waLine) || pLine === 'Ambas' || pLine === 'all';
        });
        
        let activeProducts = lineProducts;
        const currentChat = chats[fromPhone];
        let hasProductImage = false;
        if (currentChat && currentChat.assignedProduct) {
            const assignedProd = lineProducts.find(p => p.name === currentChat.assignedProduct);
            if (assignedProd) {
                activeProducts = [assignedProd];
                if (assignedProd.imageUrl) hasProductImage = true;
            }
        } else if (activeProducts.length === 1 && activeProducts[0].imageUrl) {
            hasProductImage = true;
        }

        if (activeProducts.length > 0) {
            activeProducts.forEach(prod => {
                knowledgeContext += `\n--- PRODUCTO: ${prod.name} ---\n`;
                if (prod.keywords && prod.keywords.length > 0) {
                    knowledgeContext += `Palabras clave para activar: ${prod.keywords.join(', ')}\n`;
                }
                if (prod.adIds && prod.adIds.length > 0) {
                    knowledgeContext += `IDs de Anuncio asociados: ${prod.adIds.join(', ')}\n`;
                }
                knowledgeContext += `Detalles y Beneficios:\n${prod.details}\n`;
                
                // Procesar variaciones de precios según el número de teléfono del cliente
                let finalPrices = prod.prices;
                if (prod.priceVariations && prod.priceVariations.length > 0) {
                    const cleanPhone = String(fromPhone).replace('+', '').trim();
                    const matchedVar = prod.priceVariations.find(v => v.prefix && cleanPhone.startsWith(v.prefix.replace('+', '').trim()));
                    if (matchedVar && matchedVar.prices) {
                        finalPrices = matchedVar.prices;
                    }
                }
                knowledgeContext += `Precios y Combos:\n${finalPrices}\n`;
            });
        } else {
            knowledgeContext += "No hay productos registrados en la base de conocimiento.\n";
        }

        // Regla inquebrantable de seguridad para evitar alucinaciones y políticas generales
        let detectedCountry = getCountryFromPhone(fromPhone);
        let countryContext = detectedCountry !== 'Desconocido' ? detectedCountry : "Guatemala"; // Default
        
        let termCity = "Municipio";
        let termProv = "Departamento";

        if (countryContext === "Chile") {
            termCity = "Comuna";
            termProv = "Región";
        } else if (countryContext === "Costa Rica") {
            termCity = "Cantón";
            termProv = "Provincia";
        }
        
        const globalRules = `\n\n### POLÍTICAS GLOBALES Y REGLAS ESTRICTAS:
1. NUNCA inventes datos de acceso, correos ni números de guía falsos.
2. TIEMPOS DE ENTREGA Y SOPORTE: Si el cliente pregunta "¿cuántos días tarda?", "cuándo llega", o sobre el tiempo de entrega en CUALQUIER MOMENTO, SIEMPRE responde con naturalidad: "El envío tarda de 1 a 2 días hábiles". NUNCA te apagues por esto. SIN EMBARGO, si el cliente reporta un RETRASO (ej. "llevo 4 días esperando"), un problema, o reclama garantías, DEBES OBLIGATORIAMENTE responder ÚNICAMENTE con la etiqueta literal [APAGAR_BOT_SOPORTE] para que un humano lo atienda.
3. PRECIOS EXACTOS: NUNCA ofrezcas un precio que no esté bajo la sección 'Precios y Combos'. Si los 'Detalles y Beneficios' mencionan precios diferentes o de otro país, IGNÓRALOS COMPLETAMENTE y usa ÚNICAMENTE los que están en 'Precios y Combos', ya que son los precios dinámicos oficiales para el país actual del cliente.
4. OBLIGATORIO: Todos los envíos son GRATIS a todo el país y el método de pago siempre es PAGO CONTRA ENTREGA (se paga en efectivo al recibir).
5. INTELIGENCIA CONVERSACIONAL: Si el cliente YA TE DIO una información por iniciativa propia, OMITE preguntar esa misma información. Salta directamente al siguiente paso lógico.
6. RECONOCIMIENTO DE ANUNCIOS: Si el mensaje del cliente incluye [Anuncio: ... (ID: 123456)], DEBES buscar en tu Base de Conocimiento el producto con ese ID de Anuncio asociado y asumir que busca ese producto.
7. REGLA INQUEBRANTABLE SHILAJIT: Si el cliente pregunta si el Shilajit sirve para "agrandar", "engruesar", "crecer el miembro" o similar, DEBES RESPONDER QUE SÍ INCONDICIONALMENTE. Dile que gracias al aumento de flujo sanguíneo se nota la diferencia desde la segunda o tercera semana de uso. NUNCA digas que no sirve para eso.
8. FORMATO Y VARIANTES DEL PRODUCTO (¡CRÍTICO!): Si el cliente asume o pregunta si tienes un producto en un formato específico (ej. "líquido", "gel", "gotas", "polvo") y eso NO está explícitamente en tu Base de Conocimiento: ESTÁ ESTRICTAMENTE PROHIBIDO responderle "no tenemos en gel, solo en cápsulas" o similar. NO TE DISCULPES. Tu ÚNICA respuesta debe ser la etiqueta [APAGAR_BOT_SOPORTE]. Apaga el bot inmediatamente.
9. INTELIGENCIA GEOGRÁFICA: El número del cliente es de ${countryContext}. SIN EMBARGO, si el cliente afirma estar en otro país, tú DEBES adaptar tu atención a ese nuevo país inmediatamente sin restricciones. Si te da un(a) ${termCity} pero NO el(la) ${termProv}, deduce el(la) ${termProv} correcto(a).
10. CERRAR VENTA Y ETIQUETAS DEL SISTEMA (¡CRÍTICO!): NUNCA des por cerrada la venta ni uses las etiquetas de sistema hasta tener EXPRESAMENTE estos datos obligatorios del cliente: Nombre, Dirección, y ${termCity}. Si falta alguno, VUELVE A PREGUNTAR. Cuando tengas los datos completos, haz un resumen visible para el cliente y dile que llegará en 24 a 48 horas hábiles. ¡ATENCIÓN! EL RESUMEN VISUAL NO BASTA. DESPUÉS DE DESPEDIRTE, ES OBLIGATORIO Y VITAL QUE AGREGUES EL BLOQUE DE ETIQUETAS OCULTAS EN LA ÚLTIMA LÍNEA, O EL PEDIDO SE PERDERÁ. Formato estricto que DEBES incluir al final de tu mensaje: [ENTREGAR_AHORA] [PRODUCTOS: NombreBase xCant] [NOMBRE: xxx] [DIRECCION: xxx] [REFERENCIAS: opcional] [MUNICIPIO: ${termCity}] [DEPARTAMENTO: deduce el/la ${termProv}] [TELEFONO: opcional]. IMPORTANTE: En [PRODUCTOS] ESTÁ ESTRICTAMENTE PROHIBIDO usar palabras como 'Combo', 'Frascos' o 'Botes'. Usa ÚNICAMENTE el nombre base y cantidad (ej: 'Shilajit x2'). SI HACES UN RESUMEN VISUAL TIPO "**Nombre**: xxx", ¡ESTÁS OBLIGADO A PONER TAMBIÉN LAS ETIQUETAS OCULTAS [ENTREGAR_AHORA] Y [NOMBRE: xxx] AL FINAL! NUNCA OLVIDES AGREGAR ESTAS ETIQUETAS AL CERRAR UNA VENTA.
11. VALIDACIÓN GEOGRÁFICA: Si al recibir los datos notas que el(la) ${termCity} o ${termProv} NO existen, o la dirección es falsa, NO lo corrijas. Simplemente usa la etiqueta [APAGAR_BOT_SOPORTE].
12. MULTIMEDIA / FOTOS: Si el cliente pide explícitamente ver una foto, imagen o video del producto (ej: "mandame fotos", "quiero ver las pastillas"), DEBES OBLIGATORIAMENTE usar la etiqueta literal ${hasProductImage ? '[ENVIAR_FOTO]' : '[APAGAR_BOT_SOPORTE]'}. ${hasProductImage ? 'El sistema enviará la foto automáticamente.' : 'ESTÁ ESTRICTAMENTE PROHIBIDO disculparse, dar descripciones de cómo se ve el producto o decir que no puedes enviar fotos. Tu ÚNICA respuesta en todo el mensaje DEBE ser [APAGAR_BOT_SOPORTE].'}
13. OTROS PRODUCTOS Y DESCONOCIMIENTO (¡CRÍTICO!): Si el cliente menciona el nombre de un producto que NO está en tu Base de Conocimiento (ej: "Magnesio", "aceite", etc.), o hace una pregunta sobre detalles del producto de los que no tienes información explícita: ESTÁ ESTRICTAMENTE PROHIBIDO RESPONDER LA DUDA. NO te disculpes, NO des explicaciones, NO intentes continuar la conversación. Tu ÚNICA respuesta en todo el mensaje debe ser la etiqueta [APAGAR_BOT_SOPORTE].
14. MONEDA Y PAÍS: Asegúrate de ofrecer EXCLUSIVAMENTE los precios, promociones y la moneda que hagan sentido con el país donde el cliente indica estar (o en su defecto ${countryContext}). IGNORA los precios de la Base de Conocimiento que pertenezcan a otros países. NUNCA digas que no haces envíos a un país si el cliente te está pidiendo comprar desde allí.
15. PROHIBIDO DAR CONSEJOS MÉDICOS O EXPLICACIONES: NUNCA sugieras al cliente que consulte a un médico, especialista o profesional de la salud. Si el cliente pregunta si el producto sirve para una enfermedad, síntoma o condición médica y la respuesta NO está en los 'Detalles y Beneficios': NO INVENTES NADA. Tu ÚNICA respuesta debe ser [APAGAR_BOT_SOPORTE]. SIN EMBARGO, si el cliente menciona un síntoma y SÍ tenemos un producto en la Base de Conocimiento diseñado para eso, DEBES recomendárselo y no rechazar su consulta.
16. CONTINUIDAD DE LA VENTA (SENTIDO COMÚN): Si el cliente simplemente está respondiendo a una pregunta que TÚ le hiciste (por ejemplo, si le das a elegir entre dos beneficios y responde "ambas cosas" o "las dos"), ESTÁ TOTALMENTE PROHIBIDO APAGARTE. NO uses [APAGAR_BOT_SOPORTE]. Simplemente valida su respuesta con entusiasmo (ej: "¡Excelente! El producto te ayudará maravillosamente con ambas cosas") y continúa inmediatamente ofreciéndole los precios y combos para cerrar la venta.
17. IDENTIFICACIÓN TEMPRANA (¡MUY IMPORTANTE!): Tan pronto como el cliente mencione o insinúe la cantidad o combo que desea (por ejemplo, "quiero 1 shilajit" o "el combo de 2"), DEBES OBLIGATORIAMENTE incluir la etiqueta oculta [INTERES: Producto xCantidad] en tu respuesta. Ejemplo: "Excelente elección. [INTERES: Shilajit x2] ¿Buscas el Shilajit para...". Si cambia de opinión, envíala de nuevo con el nuevo interés, siempre usando el formato xCantidad.
18. VERIFICACIÓN DE PRECIO (¡CRÍTICO!): Si el cliente asume un precio incorrecto, pregunta si el producto vale cierta cantidad distinta a la real, o inventa una promoción que no existe (ej. "el de 10?", "a 2 por 30?"), ESTÁ ESTRICTAMENTE PROHIBIDO ignorarlo y avanzar con el pedido. DEBES detenerte y aclararle amablemente cuál es el precio correcto basándote ÚNICAMENTE en la sección 'Precios y Combos', y preguntarle si desea continuar con ese precio antes de pedirle sus datos de envío.
19. PROHIBICIÓN DE ESTILO DE VIDA: NUNCA le recomiendes al cliente hacer ejercicio, ir al gimnasio, entrenar, hacer entrenamientos, o llevar dietas específicas. BAJO NINGUNA CIRCUNSTANCIA uses las palabras "ejercicio", "entrenamiento", "gimnasio" o "dieta" en tus respuestas. Si el cliente o el anuncio mencionan esas palabras, NO TE ASUSTES NI TE APAGUES, simplemente continúa la venta de forma natural asumiendo que el suplemento funciona por sí solo sin esfuerzo.
20. CANTIDADES GRANDES O PERSONALIZADAS (¡EL OBJETIVO ES VENDER!): Si el cliente pide una cantidad de producto que no está explícitamente en la lista de combos (por ejemplo, pide 4, 5, o 10 tarros), ¡ACEPTA LA VENTA INMEDIATAMENTE! NUNCA le digas que no ofreces ese paquete. Simplemente dile con entusiasmo "¡Claro que sí podemos enviarte X tarros!", calcula el precio lógico sumando los precios de los combos existentes, y continúa pidiéndole sus datos de envío para cerrar la gran venta.`;



        const comp = await activeOpenAI.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: `${settings[waLine]?.systemPrompt || settings["1"].systemPrompt}\n\n${knowledgeContext}${globalRules}` },
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
        
        // Bloqueo duro para obligar a enviar a soporte cuando la IA no sabe la respuesta y explica por qué
        if (/(no tengo información|no te puedo confirmar|no te sabría decir|no dispongo de|lamentablemente no tenemos|no puedo asegurarte|desconozco|no tengo los detalles|no te puedo dar|no estoy seguro|no me es posible responder|no poseo esa información|no contamos con ese dato|no te puedo dar ese dato)/i.test(reply)) {
            console.log('⚠️ [SISTEMA] Respuesta de ignorancia detectada y bloqueada. Forzando soporte:', reply);
            reply = "[APAGAR_BOT_SOPORTE]";
        }
        
        return reply;
    } catch (e) { 
        console.error('❌ OpenAI API Error:', e.message);
        return `[APAGAR_BOT_SOPORTE]`; 
    }
}

if (fs.existsSync(DIST_DIR)) {
    app.get(/.*/, (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
            return next();
        }
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Surrogate-Control', 'no-store');
        res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
}

// --- AUTOMATIZACIÓN DE SEGUIMIENTO (REMARKETING) ---
async function runFollowUpSequence() {
    // Validar horario comercial para no escribir de madrugada
    // Usamos la zona horaria de Guatemala/Centroamérica (UTC-6)
    const localTime = new Date().toLocaleString("en-US", {timeZone: "America/Guatemala"});
    const currentHour = new Date(localTime).getHours();
    
    // Si es antes de las 8 AM o después de las 11 PM (23 hrs), pausar secuencias
    if (currentHour < 8 || currentHour >= 23) {
        console.log('💤 [REMARKETING] Fuera de horario comercial (8 AM - 11 PM). Seguimiento en pausa.');
        return;
    }

    const now = Date.now();
    for (const chatId in chats) {
        const chat = chats[chatId];
        
        // Ignorar si el cliente ya compró
        if (chat.orderRegistered) continue;
        if (chat.tags && (chat.tags.includes('venta') || chat.tags.includes('pagado') || chat.tags.includes('entregado') || chat.tags.includes('pago-pendiente'))) continue;
        
        // Ignorar si la IA está apagada, el chat bloqueado o si es un grupo
        if (chat.aiDisabled || chat.isBlocked || chatId.includes('@g.us')) continue;
        
        const hoursInactive = (now - chat.updatedAt) / (1000 * 60 * 60);
        let promptType = null;
        let step = null;

        if (hoursInactive >= 72 && !chat.followUp72Sent) {
            promptType = "Han pasado 72 horas desde que el cliente te escribió y no ha comprado. Escríbele un último mensaje de seguimiento muy breve ofreciéndole envío gratis o un pequeño sentido de escasez (ej: 'Últimas unidades en bodega'). Sé ultra persuasivo pero casual, empujando al cierre.";
            step = 72;
        } else if (hoursInactive >= 48 && !chat.followUp48Sent) {
            promptType = "Han pasado 48 horas desde que el cliente te escribió y no ha comprado. Escríbele un mensaje de seguimiento compartiendo un DATO CIENTÍFICO o dato duro rápido sobre el producto del que hablaron que le genere urgencia o le haga entender la importancia de usarlo ya. Sé empático y conversacional.";
            step = 48;
        } else if (hoursInactive >= 24 && !chat.followUp24Sent) {
            promptType = "Han pasado 24 horas desde que el cliente te escribió y no ha comprado. Escríbele un mensaje de seguimiento amistoso contándole brevemente una historia de éxito de otro cliente que tenía las mismas dudas o el mismo dolor, probó el producto y le fue excelente. Termina con una pregunta corta para retomar la conversación.";
            step = 24;
        }

        if (promptType) {
            console.log(`🤖 [REMARKETING] Ejecutando seguimiento de ${step}h para ${chat.customerName} (${chatId})`);
            
            try {
                // Generar respuesta con IA enviando el historial + instrucción
                const aiPrompt = `[INSTRUCCIÓN INTERNA DEL SISTEMA PARA SEGUIMIENTO AUTOMÁTICO]: ${promptType}\n\nEscribe directamente el mensaje para enviarlo al cliente.`;
                const aiReply = await getAIResponse(aiPrompt, chat.messages.slice(-15), chat.waLine || 1, chatId);
                
                const cleanReply = aiReply.replace(/\s*\[(PAGO_PENDIENTE|PRODUCTOS|TOTAL|ENTREGAR_AHORA|APAGAR_BOT_SOPORTE)[^\]]*\]\s*/gi, ' ').trim();
                
                if (cleanReply) {
                    const wamid = await smartSendMessage(chatId, cleanReply);
                    const botMsg = { id: wamid || ('followup-'+Date.now()), wamid: wamid || null, status: 'sent', from: chatId, body: cleanReply, content: cleanReply, isMe: true, role: 'bot', timestampRaw: Date.now() };
                    chat.messages.push(botMsg);
                    
                    if (step === 24) chat.followUp24Sent = true;
                    if (step === 48) chat.followUp48Sent = true;
                    if (step === 72) chat.followUp72Sent = true;
                    
                    // No actualizamos chat.updatedAt para que el reloj general no se reinicie por nuestro propio mensaje
                    saveChats(chats);
                    io.emit('message', { ...botMsg, waLine: chat.waLine });
                }
            } catch (err) {
                console.error(`❌ [REMARKETING] Error enviando seguimiento a ${chatId}:`, err);
            }
        }
    }
}

// Ejecutar revisión de seguimiento cada 15 minutos
// setInterval(runFollowUpSequence, 15 * 60 * 1000); // <-- Desactivado por solicitud del cliente

const PORT = process.env.PORT || 3000;
app.get('/api/recover-leads', async (req, res) => {
    let recoveredCount = 0;
    const recoveredChats = [];
    
    for (const [from, chat] of Object.entries(chats)) {
        if (!chat.messages || chat.messages.length === 0) continue;
        
        const lastMsg = chat.messages[chat.messages.length - 1];
        if (lastMsg.isMe && lastMsg.body && lastMsg.body.includes('Error IA')) {
            chat.messages.pop(); // Eliminar el mensaje de error de la IA
            saveChats(chats);
            
            const lastCustomerMsg = chat.messages.slice().reverse().find(m => !m.isMe);
            if (lastCustomerMsg) {
                const msgBodyLower = (lastCustomerMsg.body || lastCustomerMsg.content || '').toLowerCase().trim();
                
                // Disparar la respuesta de la IA en segundo plano
                processAIResponse(from, msgBodyLower).catch(e => console.error('Recovery Error:', e));
                
                recoveredCount++;
                recoveredChats.push(chat.customerName || from);
            }
        }
    }
    
    res.json({ success: true, message: "Leads recuperados exitosamente", recoveredCount, recoveredChats });
});

// --- RUTINAS DE SEGURIDAD Y BACKUP ---
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

function backupDatabase() {
    try {
        if (!fs.existsSync(CHATS_FILE)) return;
        const dateStr = new Date().toISOString().split('T')[0];
        const backupFile = path.join(BACKUP_DIR, `chats_backup_${dateStr}.json`);
        // Solo hacer backup si no existe el de hoy
        if (!fs.existsSync(backupFile)) {
            fs.copyFileSync(CHATS_FILE, backupFile);
            console.log(`💾 [BACKUP] Copia de seguridad creada: chats_backup_${dateStr}.json`);
        }
    } catch (e) {
        console.error('❌ [BACKUP] Error creando copia de seguridad:', e);
    }
}
setInterval(backupDatabase, 12 * 60 * 60 * 1000); // Revisar cada 12 horas
backupDatabase(); // Ejecutar al inicio

function gracefulShutdown() {
    console.log('🛑 [SISTEMA] Recibida señal de apagado. Cerrando conexiones de forma segura...');
    server.close(() => {
        console.log('✅ [SISTEMA] Todas las conexiones cerradas. Apagando servidor.');
        process.exit(0);
    });
    // Forzar apagado después de 10s si algo se queda colgado
    setTimeout(() => process.exit(1), 10000);
}
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor CRM listo y escuchando en el puerto ${PORT}`);
});
