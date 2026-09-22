import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const targetLine = "app.post('/api/incidents/import', async (req, res) => {";

const endpoints = `
app.post('/api/incidents/draft/generate', async (req, res) => {
    try {
        const { incidentId } = req.body;
        const incident = incidents.find(i => i.id === incidentId);
        if (!incident) return res.status(404).json({ error: 'Incident not found' });
        
        let chatContext = '';
        if (incident.chatId && incident.chatId !== 'AMBIGUOUS_MATCH') {
            const chat = db.chats.find(c => c.id === incident.chatId);
            if (chat && chat.messages) {
                // Get last 15 messages to understand context
                chatContext = chat.messages.slice(-15).map(m => \`\${m.role === 'user' ? 'Cliente' : 'Asesor/Bot'}: \${m.body || m.content}\`).join('\\n');
            }
        }
        
        const systemPrompt = \`Eres un asistente de atención al cliente experto en logística para e-commerce. Tu tarea es redactar un borrador de mensaje de WhatsApp (breve, amable, natural y en español) para un cliente que tiene una incidencia con su entrega.
        
Reglas estrictas:
- El mensaje NO debe exceder los 2-3 párrafos cortos.
- Si la incidencia es por no poder contactar al cliente o porque no estaba, pregúntale educadamente a qué hora o cuándo puede atender al transportador.
- Si el conductor NO dejó detalles del motivo ("Sin motivo especificado") o está vacío, pregunta si hubo algún inconveniente con la entrega SIN inventar el motivo.
- Usa el contexto del chat para NO pedir información que el cliente ya dio (ej. si en los últimos mensajes ya dio una dirección alternativa o celular, confírmala en lugar de pedirla de nuevo).
- NO inventes datos ni prometas fechas exactas de entrega.
- Dirígete al cliente por su nombre: \${incident.firstName} \${incident.lastName}.
- El pedido es el #\${incident.orderNumber}.
- El motivo reportado por la transportadora es: "\${incident.reason || 'Sin detalles proporcionados'}".
- Categoría de la incidencia: \${incident.category || 'No categorizado'}.

Contexto reciente del chat con el cliente:
\${chatContext || '(No hay contexto previo de chat)'}

Escribe SOLO el contenido del mensaje a enviar, sin comillas ni aclaraciones extras.\`;
        
        const draft = await getAIResponse(systemPrompt, [], 1, incident.phone);
        res.json({ draft });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to generate draft' });
    }
});

app.put('/api/incidents/:id/draft', (req, res) => {
    const { id } = req.params;
    const { draftMessage } = req.body;
    
    const idx = incidents.findIndex(i => i.id === id);
    if (idx !== -1) {
        incidents[idx].draftMessage = draftMessage;
        saveIncidents(incidents);
        io.emit('incidents_updated', incidents);
        res.json({ success: true, incident: incidents[idx] });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

`;

if (content.includes(targetLine)) {
    content = content.replace(targetLine, endpoints + targetLine);
    fs.writeFileSync('server/index.js', content);
    console.log("Patched server/index.js");
} else {
    console.log("Target not found!");
}
