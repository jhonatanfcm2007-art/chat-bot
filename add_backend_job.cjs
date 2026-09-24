const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const syncJob = `

// --- AUTO SYNC & AUTO SEND GUIDES LOGIC ---
let isSyncingGuides = false;

async function syncDropiGuides() {
    if (isSyncingGuides) return;
    if (!settings.autoSyncGuides) return;
    
    isSyncingGuides = true;
    try {
        let serviceUrl = process.env.PLAYWRIGHT_SERVICE_URL;
        if (!serviceUrl) {
            console.error('[AutoSync] Falta PLAYWRIGHT_SERVICE_URL');
            isSyncingGuides = false;
            return;
        }
        serviceUrl = serviceUrl.trim().replace(/\\/$/, '');
        if (!/^https?:\\/\\//i.test(serviceUrl)) serviceUrl = 'http://' + serviceUrl;

        console.log('[AutoSync] Solicitando guías recientes al microservicio...');
        const fetchRes = await fetch(\`\${serviceUrl}/api/soydrop/sync-recent-orders\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await fetchRes.json();
        if (!data.success || !data.orders) {
            console.error('[AutoSync] Error de Playwright:', data);
            isSyncingGuides = false;
            return;
        }

        console.log(\`[AutoSync] Obtenidas \${data.orders.length} órdenes. Procesando...\`);
        
        let updatedCount = 0;
        let sentCount = 0;

        // Process orders
        for (const order of data.orders) {
            if (!order.guide || order.guide === 'No detectada') continue;

            const searchStr = order.rawText.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
            
            // Buscar chat correspondiente
            for (const [chatId, chat] of Object.entries(chats)) {
                const cPhone = (chat.orderPhone || '').replace(/\\D/g, '');
                const cName = (chat.orderName || chat.customerName || '').toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
                
                let isMatch = false;
                let matchType = '';

                if (cPhone && cPhone.length > 6 && searchStr.includes(cPhone)) {
                    isMatch = true;
                    matchType = 'phone';
                } else if (cName && cName.length > 3 && searchStr.includes(cName)) {
                    isMatch = true;
                    matchType = 'name';
                }

                if (isMatch) {
                    if (!chat.orders) chat.orders = [];
                    const existingOrderIndex = chat.orders.findIndex(o => o.soyDropOrder === order.soyDropOrder || o.guide === order.guide);
                    
                    let needsReview = matchType === 'name';
                    
                    if (existingOrderIndex === -1) {
                        chat.orders.push({
                            guide: order.guide,
                            soyDropOrder: order.soyDropOrder,
                            status: order.status,
                            date: new Date().toISOString(),
                            guideStatus: needsReview ? 'revisar' : 'pendiente',
                            matchType
                        });
                        updatedCount++;
                        io.emit('chat_meta_updated', { id: chatId, chat });
                    } else {
                        const eo = chat.orders[existingOrderIndex];
                        if (eo.guide !== order.guide) {
                            eo.guide = order.guide;
                            eo.guideStatus = 'revisar'; // requires review if guide changed
                            updatedCount++;
                            io.emit('chat_meta_updated', { id: chatId, chat });
                        } else if (eo.status !== order.status) {
                            eo.status = order.status;
                            updatedCount++;
                            io.emit('chat_meta_updated', { id: chatId, chat });
                        }
                    }
                    
                    // Solo asignamos al primer chat coincidente
                    break;
                }
            }
        }
        
        if (updatedCount > 0) saveChats(chats);
        
        // AUTO SEND LOGIC
        if (settings.autoSendGuides) {
            console.log('[AutoSend] Procesando envíos automáticos...');
            // Implementar la cola secuencial aquí
            for (const [chatId, chat] of Object.entries(chats)) {
                if (!chat.orders) continue;
                for (let i = 0; i < chat.orders.length; i++) {
                    const order = chat.orders[i];
                    
                    if (order.guideStatus !== 'pendiente') continue;
                    
                    const st = (order.status || '').toLowerCase();
                    if (st.includes('cancelado') || st.includes('entregado')) continue;

                    // Generate message
                    const cName = chat.orderName || chat.customerName || '';
                    let msg = '¡Hola ' + (cName ? cName.split(' ')[0] : 'estimado cliente') + '! 👋\\n\\n';
                    if (st.includes('creado') || st.includes('pendiente')) {
                        msg += 'Tu pedido ha sido procesado exitosamente y pronto será despachado. 📦\\n\\n';
                    } else {
                        msg += 'Te confirmamos que tu pedido ya va en camino hacia tu dirección. 🚚💨\\n\\n';
                    }
                    if (order.soyDropOrder && order.soyDropOrder !== '?' && order.soyDropOrder !== 'No detectada') {
                        msg += '🧾 *Orden:* ' + order.soyDropOrder + '\\n';
                    }
                    msg += '🔢 *Guía:* ' + order.guide + '\\n';
                    if (order.status && order.status !== 'Desconocido' && order.status !== 'No detectado') {
                        msg += '📌 *Estado Actual:* ' + order.status + '\\n\\n';
                    }
                    msg += '¡Gracias por tu compra! ✨';
                    
                    // Send
                    const phone = chat.orderPhone || chatId.split('@')[0].split('_')[0];
                    console.log(\`[AutoSend] Enviando guía \${order.guide} a \${chatId}...\`);
                    const sendResult = await smartSendMessage(chatId, msg);
                    
                    if (sendResult) {
                        order.guideStatus = 'enviada';
                        order.guideMessageId = (typeof sendResult === 'object' ? sendResult.id : sendResult) || Date.now().toString();
                        order.guideSentAt = new Date().toISOString();
                        
                        chat.messages.push({
                            id: order.guideMessageId,
                            isMe: true,
                            body: msg,
                            time: new Date().toLocaleTimeString('es-CO')
                        });
                        
                        sentCount++;
                        saveChats(chats);
                        io.emit('message', { ...chat.messages[chat.messages.length - 1], from: chatId });
                        io.emit('chat_meta_updated', { id: chatId, chat });
                        
                        // Pausa de 3 segundos entre envíos para evitar bloqueos
                        await new Promise(r => setTimeout(r, 3000));
                    }
                }
            }
        }
        
    } catch (e) {
        console.error('[AutoSync] Error general:', e);
    }
    isSyncingGuides = false;
}

// Ejecutar cada 30 minutos
setInterval(syncDropiGuides, 30 * 60 * 1000);

app.post('/api/settings/toggle-auto-guides', (req, res) => {
    const { autoSyncGuides, autoSendGuides } = req.body;
    if (typeof autoSyncGuides !== 'undefined') settings.autoSyncGuides = autoSyncGuides;
    if (typeof autoSendGuides !== 'undefined') settings.autoSendGuides = autoSendGuides;
    saveSettings(settings);
    res.json({ success: true, settings });
});

app.post('/api/soydrop/trigger-sync', async (req, res) => {
    syncDropiGuides();
    res.json({ success: true, message: 'Sincronización iniciada en segundo plano.' });
});

`;

if (!code.includes('syncDropiGuides')) {
    code = code.replace('const PORT = process.env.PORT', syncJob + '\nconst PORT = process.env.PORT');
    fs.writeFileSync('server/index.js', code);
    console.log('Added auto sync job to backend');
}
