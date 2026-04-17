const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');
const OpenAI = require('openai');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json()); // Necesario para procesar JSON de Meta
app.use(express.static(path.join(__dirname, '../dist')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
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

let inventory = [];

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
            const from = msg.from; // Número del cliente
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

                io.emit('message', messageData);

                // Procesar con IA
                const aiReply = await getAIResponse(msgBody);
                
                // Simular escritura y delay
                await delay(2000);

                // Enviar respuesta vía Meta
                await sendMessageToCloudAPI(from, aiReply);

                // Notificar al Dashboard el mensaje enviado por el bot
                io.emit('message', {
                    id: 'bot-' + Date.now(),
                    from: from,
                    customerName: 'Bot',
                    body: aiReply,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isMe: true,
                    role: 'bot'
                });
            }
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

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
            : "Actualmente no se ha sincronizado el inventario.";

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

io.on('connection', (socket) => {
    console.log('A client connected');
    
    // El bot ahora siempre se considera conectado si las llaves existen
    const status = (WHATSAPP_TOKEN && PHONE_ID) ? 'CONNECTED' : 'DISCONNECTED';
    socket.emit('status', status);

    socket.on('sync_inventory', (data) => {
        inventory = data;
    });

    socket.on('send_message', async ({ to, content }) => {
        try {
            await sendMessageToCloudAPI(to, content);
            // Emitir de vuelta para el dashboard
            io.emit('message', {
                id: 'man-' + Date.now(),
                from: to,
                customerName: 'Yo',
                body: content,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isMe: true,
                role: 'bot'
            });
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
    console.log(`🔗 Webhook URL: http://tu-servidor.com/webhook`);
});
