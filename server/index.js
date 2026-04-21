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
            return JSON.parse(raw);
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
        systemPrompt: "Eres un asistente virtual de ventas para WhatsApp. Sé cordial, breve, persuasivo y usa emojis.\n\nRegla importante: Si el cliente pide soporte, necesita hacer un pago que requiera confirmación humana, o hace una pregunta que no puedes resolver, incluye la palabra secreta '[REQUIERE_HUMANO]' en tu respuesta y despídete amablemente diciendo que un agente humano lo atenderá."
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
    return [];
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
    return [];
}

function saveProviders(data) {
    try {
        fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error('❌ Error guardando proveedores:', err.message);
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
    return [];
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
    return [];
}

function saveProviders(data) {
    try {
        fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error('❌ Error guardando proveedores:', err.message);
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
    return [];
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
    return [];
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
let platforms = loadPlatforms();
let providers = loadProviders();
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
            
            let msgBody = '';
            
            if (msg.type === 'image') {
                msgBody = '[IMAGEN RECIBIDA] EL CLIENTE ACABA DE ENVIAR UN COMPROBANTE FOTOGRÁFICO.';
                io.emit('receipt_received', { from, customerName, message: msgBody });
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
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isMe: false,
                    role: 'user'
                };

                // Persistir mensaje del cliente
                if (!chats[from]) chats[from] = { from, customerName, messages: [] };
                
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
                }

                // 2. Detección de Pago Pendiente (Venta realizada pero sin confirmar)
                const pagoRegex = /\[?(PAGO_PENDIENTE|PAGO PENDIENTE)\]?/i;
                if (pagoRegex.test(aiReply)) {
                    chats[from].tags = chats[from].tags || [];
                    if (!chats[from].tags.includes('pago-pendiente')) {
                        chats[from].tags.push('pago-pendiente');
                        saveChats(chats);
                        io.emit('tag_updated', { from, tags: chats[from].tags });
                    }
                    aiReply = aiReply.replace(pagoRegex, '').trim();
                }
                
                await delay(2000);

                await sendMessageToCloudAPI(from, aiReply);

                const botMsgData = {
                    id: 'bot-' + Date.now(),
                    from: from,
                    customerName: 'Bot',
                    body: aiReply,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isMe: true,
                    role: 'bot',
                    requiresHuman
                };

                // Persistir respuesta del bot
                chats[from].messages.push({ ...botMsgData, content: aiReply });
                chats[from].updatedAt = Date.now();
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
            ? "El inventario actual es: " + inventory.map(item => `${item.name} - $${item.price} (${item.stock} disponibles)`).join(', ')
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
    socket.emit('platforms_updated', platforms);
    socket.emit('providers_updated', providers);
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
            await sendMessageToCloudAPI(to, content);
            const msgData = {
                id: 'man-' + Date.now(),
                from: to,
                customerName: 'Yo',
                body: content,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isMe: true,
                role: 'bot'
            };

            // Persistir mensaje manual
            if (!chats[to]) chats[to] = { from: to, customerName: 'Cliente', messages: [] };
            chats[to].messages.push({ ...msgData, content });
            chats[to].updatedAt = Date.now();
            saveChats(chats);

            io.emit('message', msgData);
        } catch (err) {
            console.error('Error manual sending message:', err);
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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Meta Bot Server listening on port ${PORT}`);
    console.log(`📦 Inventario: ${inventory.length} | 📈 Ventas: ${sales.length}`);
});
