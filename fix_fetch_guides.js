import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const fetchGuidesCode = `app.post('/api/fetch-guides', async (req, res) => {
    try {
        const { chatId } = req.body;
        if (!chatId || !chats[chatId]) {
            return res.status(400).json({ success: false, error: "Chat no encontrado" });
        }

        const chat = chats[chatId];
        const customerName = chat.customerName || chat.orderName;
        if (!customerName) {
            return res.status(400).json({ success: false, error: "El chat no tiene un nombre de cliente registrado." });
        }

        let serviceUrl = process.env.PLAYWRIGHT_SERVICE_URL || 'http://localhost:3001';
        serviceUrl = serviceUrl.trim().replace(/\\/$/, '');
        if (!/^https?:\\/\\//i.test(serviceUrl)) {
            serviceUrl = 'http://' + serviceUrl;
        }

        console.log(\`Solicitando guía para \${customerName} al microservicio en \${serviceUrl}...\`);

        const fetchRes = await fetch(\`\${serviceUrl}/api/soydrop/get-guide\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                customerName: customerName,
                phoneHint: chat.orderPhone || chatId.split('_')[0]
            })
        });
        
        const data = await fetchRes.json();
        if (!data.success) {
            return res.status(500).json(data);
        }

        // Verificamos si el teléfono coincide para asociarlo de forma segura
        const phoneHintClean = (chat.orderPhone || chatId.split('_')[0]).replace(/\\D/g, '');
        const dataPhoneClean = (data.phone || '').replace(/\\D/g, '');

        let safeToAssign = false;
        if (dataPhoneClean && phoneHintClean && (dataPhoneClean.includes(phoneHintClean) || phoneHintClean.includes(dataPhoneClean))) {
            safeToAssign = true;
        } else if (dataPhoneClean.length < 5) {
            // A veces el teléfono no se puede extraer correctamente de la página
            safeToAssign = true; // Confiaremos en el nombre exacto si el teléfono no se vio en la UI
        }

        if (!safeToAssign) {
            return res.json({ 
                success: false, 
                error: \`Ambigüedad detectada. Teléfono en Dropi (\${data.phone}) no coincide con el chat (\${chat.orderPhone}). Se requiere revisión manual.\`,
                data
            });
        }

        // Guardar por pedido (array) en lugar de sobrescribir
        if (!chat.orders) chat.orders = [];
        
        // Evitar duplicados
        const existingOrder = chat.orders.find(o => o.guide === data.guide || (data.soyDropOrder && o.soyDropOrder === data.soyDropOrder));
        if (!existingOrder) {
            chat.orders.push({
                guide: data.guide,
                soyDropOrder: data.soyDropOrder,
                status: data.status,
                phoneAssigned: data.phone,
                timestamp: Date.now()
            });
            // Por retrocompatibilidad con la UI temporal:
            chat.trackingGuide = data.guide;
            chat.orderStatus = data.status;
            
            saveChats(chats);
            io.emit('chat_meta_updated', { id: chatId, chat: chat });
        }

        res.json({ success: true, matchedCount: 1, orderData: data });

    } catch (e) {
        console.error("Error al obtener guías:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});`;

// Replace the old /api/fetch-guides
content = content.replace(/app\.post\('\/api\/fetch-guides'[\s\S]*?\}\);/m, fetchGuidesCode);

fs.writeFileSync('server/index.js', content);
console.log("Updated /api/fetch-guides");
