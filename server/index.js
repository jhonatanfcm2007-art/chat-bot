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

// Cargar datos al iniciar el servidor
let inventory = loadInventory();
let sales = loadSales();
let chats = loadChats();

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
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        if (body.entry && 
            body.entry[0].changes && 
            body.entry[0].changes[0].value.messages && 
            body.entry[0].changes[0].value.messages[0]) {

            const msg = body.entry[0].changes[0].value.messages[0];
            const from = msg.from;
            const msgBody = msg.text ? msg.text.body : '';
            const customerName = body.entry[0].changes[0].value.contacts[0].profile.name || 'Cliente';

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
                if (!chats[from]) chats[from] = { customerName, messages: [] };
                chats[from].messages.push({ ...messageData, content: msgBody });
                saveChats(chats);

                io.emit('message', messageData);

                // Procesar con IA
                const aiReply = await getAIResponse(msgBody);
                
                await delay(2000);

                await sendMessageToCloudAPI(from, aiReply);

                const botMsgData = {
                    id: 'bot-' + Date.now(),
                    from: from,
                    customerName: 'Bot',
                    body: aiReply,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isMe: true,
                    role: 'bot'
                };

                // Persistir respuesta del bot
                chats[from].messages.push({ ...botMsgData, content: aiReply });
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

async function getAIResponse(message) {
    if (!openai) return "Modo IA desactivado. Configura tu API Key de OpenAI en el archivo .env.";
    
    try {
        const inventoryContext = inventory.length > 0
            ? "El inventario actual es: " + inventory.map(item => `${item.name} - $${item.price} (${item.stock} disponibles)`).join(', ')
            : "Actualmente no hay inventario cargado.";

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: `Eres un asistente virtual de ventas para WhatsApp. Sé cordial, breve, persuasivo y usa emojis. Basate en esta información para responder: ${inventoryContext}` },
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
            if (!chats[to]) chats[to] = { customerName: 'Cliente', messages: [] };
            chats[to].messages.push({ ...msgData, content });
            saveChats(chats);

            io.emit('message', msgData);
        } catch (err) {
            console.error('Error manual sending message:', err);
        }
    });
});

app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🚀 Meta Bot Server listening on port ${PORT}`);
    console.log(`📦 Inventario: ${inventory.length} | 📈 Ventas: ${sales.length}`);
});
