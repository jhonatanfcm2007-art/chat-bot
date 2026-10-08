const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const queueProcessor = `
// --- PROCESAMIENTO EN SEGUNDO PLANO DE LA COLA DE DETALLES ---
let isProcessingDetails = false;
async function processDropiQueue() {
    if (isProcessingDetails) return;
    if (!settings.dropiDetailsQueue || settings.dropiDetailsQueue.length === 0) return;

    isProcessingDetails = true;
    try {
        console.log(\`[DropiQueue] Iniciando lote. Quedan \${settings.dropiDetailsQueue.length} pedidos en cola.\`);
        let serviceUrl = process.env.PLAYWRIGHT_SERVICE_URL;
        if (!serviceUrl) { isProcessingDetails = false; return; }
        serviceUrl = serviceUrl.trim().replace(/\\/$/, '');
        if (!/^https?:\\/\\//i.test(serviceUrl)) serviceUrl = 'http://' + serviceUrl;

        // Extraemos 5 para este ciclo de 3 minutos
        const batch = settings.dropiDetailsQueue.splice(0, 5).map(i => typeof i === 'string' ? { id: i, retries: 0 } : i);
        saveSettings(settings);

        for (const queueItem of batch) {
            const dropiOrderId = queueItem.id;
            try {
                console.log(\`[DropiQueue] Consultando detalle interno de Dropi para orden \${dropiOrderId}...\`);
                const resDetails = await fetch(\`\${serviceUrl}/api/soydrop/get-guide\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ targetSoyDropOrder: dropiOrderId, customerName: '' })
                });
                const detailsData = await resDetails.json();
                
                if (detailsData.success && detailsData.phone && detailsData.phone !== 'No detectado') {
                    const realPhone = detailsData.phone.replace(/\\D/g, '');
                    
                    let matchedChatId = null;
                    for (const [chatId, chat] of Object.entries(chats)) {
                        const cPhone = (chat.orderPhone || chatId.split('@')[0].split('_')[0]).replace(/\\D/g, '');
                        if (cPhone && cPhone.length > 6 && (realPhone.includes(cPhone) || cPhone.includes(realPhone))) {
                            matchedChatId = chatId;
                            break;
                        }
                    }

                    if (matchedChatId) {
                        const chat = chats[matchedChatId];
                        if (!chat.orders) chat.orders = [];
                        const existingOrderIndex = chat.orders.findIndex(o => o.soyDropOrder === dropiOrderId);
                        if (existingOrderIndex === -1) {
                            chat.orders.push({
                                guide: detailsData.guide,
                                soyDropOrder: dropiOrderId,
                                status: detailsData.status,
                                date: new Date().toISOString(),
                                guideStatus: 'pendiente',
                                matchType: 'dropi_detail'
                            });
                            io.emit('chat_meta_updated', { id: matchedChatId, chat: { ...chat, messages: undefined } });
                        }
                    } else {
                        // Coincidencia solo por nombre -> revisar
                        const searchName = detailsData.rowScraped.join(' ').toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
                        for (const [chatId, chat] of Object.entries(chats)) {
                            const cName = (chat.orderName || chat.customerName || '').toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").trim();
                            if (cName && cName.length > 3 && searchName.includes(cName)) {
                                if (!chat.orders) chat.orders = [];
                                const existingOrderIndex = chat.orders.findIndex(o => o.soyDropOrder === dropiOrderId);
                                if (existingOrderIndex === -1) {
                                    chat.orders.push({
                                        guide: detailsData.guide,
                                        soyDropOrder: dropiOrderId,
                                        status: detailsData.status,
                                        date: new Date().toISOString(),
                                        guideStatus: 'revisar',
                                        matchType: 'name'
                                    });
                                    io.emit('chat_meta_updated', { id: chatId, chat: { ...chat, messages: undefined } });
                                }
                                break;
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('[DropiQueue] Error extrayendo detalle de lote:', e.message);
                queueItem.retries++;
                if (queueItem.retries < 3) {
                    settings.dropiDetailsQueue.push(queueItem); // Al final de la cola
                } else {
                    if (!settings.dropiDetailsFailed) settings.dropiDetailsFailed = {};
                    settings.dropiDetailsFailed[dropiOrderId] = true;
                }
            }
            saveSettings(settings);
            saveChats(chats);
            await new Promise(r => setTimeout(r, 2000));
        }
    } finally {
        isProcessingDetails = false;
    }
}
setInterval(processDropiQueue, 3 * 60 * 1000); // 5 pedidos cada 3 minutos = 2400 diarios
`;

code = code.replace(/\/\/ 4\. PROCESAR COLA POR LOTES[\s\S]*?saveChats\(chats\);\s*}/g, 'saveChats(chats);');
code = code + '\n' + queueProcessor;

fs.writeFileSync('server/index.js', code);
