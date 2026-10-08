        // Process orders
        if (!settings.dropiDetailsQueue) settings.dropiDetailsQueue = [];
        
        for (const order of data.orders) {
            if (!order.guide || order.guide === 'No detectada') continue;

            const searchStr = order.rawText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            
            let isSafeMatch = false;
            let matchedChatId = null;
            let matchType = '';

            // 1. Ya asociado anteriormente (existe en chat.orders)
            for (const [chatId, chat] of Object.entries(chats)) {
                if (chat.orders && chat.orders.find(o => o.soyDropOrder === order.soyDropOrder || o.guide === order.guide)) {
                    isSafeMatch = true;
                    matchedChatId = chatId;
                    matchType = 'previo';
                    break;
                }
            }

            // 2. Si no, buscar por Shopify (interno de Soy Drop) o Teléfono visible
            if (!isSafeMatch) {
                for (const [chatId, chat] of Object.entries(chats)) {
                    const cShopifyOrder = (chat.shopifyOrderName || '').toLowerCase().trim();
                    const cPhone = (chat.orderPhone || chatId.split('@')[0].split('_')[0]).replace(/\D/g, '');

                    // Distinguimos Shopify explícito vs Teléfono explícito
                    if (cShopifyOrder && cShopifyOrder.length > 2 && searchStr.includes(cShopifyOrder)) {
                        isSafeMatch = true; matchedChatId = chatId; matchType = 'shopify'; break;
                    } else if (cPhone && cPhone.length > 6 && searchStr.includes(cPhone)) {
                        isSafeMatch = true; matchedChatId = chatId; matchType = 'phone'; break;
                    }
                }
            }

            // 3. Procesar coincidencia segura
            if (isSafeMatch && matchedChatId) {
                const chat = chats[matchedChatId];
                if (!chat.orders) chat.orders = [];
                const existingOrderIndex = chat.orders.findIndex(o => o.soyDropOrder === order.soyDropOrder || o.guide === order.guide);
                
                if (existingOrderIndex === -1) {
                    chat.orders.push({
                        guide: order.guide,
                        soyDropOrder: order.soyDropOrder,
                        status: order.status,
                        date: new Date().toISOString(),
                        guideStatus: 'pendiente',
                        matchType
                    });
                    updatedCount++;
                    io.emit('chat_meta_updated', { id: matchedChatId, chat: { ...chat, messages: undefined } });
                } else {
                    const eo = chat.orders[existingOrderIndex];
                    if (eo.guide !== order.guide) {
                        eo.guide = order.guide; eo.guideStatus = 'revisar'; updatedCount++;
                        io.emit('chat_meta_updated', { id: matchedChatId, chat: { ...chat, messages: undefined } });
                    } else if (eo.status !== order.status) {
                        eo.status = order.status; updatedCount++;
                        io.emit('chat_meta_updated', { id: matchedChatId, chat: { ...chat, messages: undefined } });
                    }
                }
            } else {
                // NO ES SEGURO. LO MANDAMOS A LA COLA DE PLAYWRIGHT PARA SACAR EL TELÉFONO DEL DETALLE.
                if (!settings.dropiDetailsQueue.includes(order.soyDropOrder)) {
                    settings.dropiDetailsQueue.push(order.soyDropOrder);
                }
            }
        }
        
        saveSettings(settings); // Guardamos la cola actualizada
        
        // 4. PROCESAR COLA POR LOTES
        if (settings.dropiDetailsQueue && settings.dropiDetailsQueue.length > 0) {
            console.log(`[AutoSync] Procesando detalles por lotes. Quedan ${settings.dropiDetailsQueue.length} pedidos en cola...`);
            // Extraer hasta 5 órdenes de la cola para no bloquear
            const batch = settings.dropiDetailsQueue.splice(0, 5);
            saveSettings(settings);

            for (const dropiOrderId of batch) {
                try {
                    console.log(`[AutoSync] Consultando detalle de Dropi para orden ${dropiOrderId}...`);
                    const reqBody = { targetSoyDropOrder: dropiOrderId, customerName: '' };
                    const resDetails = await fetch(`${serviceUrl}/api/soydrop/get-guide`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(reqBody)
                    });
                    const detailsData = await resDetails.json();
                    
                    if (detailsData.success && detailsData.phone && detailsData.phone !== 'No detectado') {
                        const realPhone = detailsData.phone.replace(/\D/g, '');
                        
                        // Buscar coincidencia exacta por teléfono
                        let matchedChatId = null;
                        for (const [chatId, chat] of Object.entries(chats)) {
                            const cPhone = (chat.orderPhone || chatId.split('@')[0].split('_')[0]).replace(/\D/g, '');
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
                                updatedCount++;
                                io.emit('chat_meta_updated', { id: matchedChatId, chat: { ...chat, messages: undefined } });
                            }
                        } else {
                            // Coincidencia solo por nombre (insegura, se va a "revisar")
                            const searchName = detailsData.rowScraped.join(' ').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                            for (const [chatId, chat] of Object.entries(chats)) {
                                const cName = (chat.orderName || chat.customerName || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
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
                                        updatedCount++;
                                        io.emit('chat_meta_updated', { id: chatId, chat: { ...chat, messages: undefined } });
                                    }
                                    break;
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('[AutoSync] Error extrayendo detalle de lote:', e.message);
                }
                
                await new Promise(r => setTimeout(r, 2000)); // Pacing the queue
            }
        }
        