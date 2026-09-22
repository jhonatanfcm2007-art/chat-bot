import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const targetRegex = /app\.post\('\/api\/incidents\/draft\/generate', async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: 'Failed to generate draft' \}\);\s*\}\s*\}\);/m;

const newEndpoint = `app.post('/api/incidents/draft/generate', async (req, res) => {
    try {
        const { incidentId } = req.body;
        const incident = incidents.find(i => i.id === incidentId);
        if (!incident) return res.status(404).json({ error: 'Incident not found' });
        
        let currentOpenai = typeof openai !== 'undefined' ? openai : null;
        if (!currentOpenai && process.env.OPENAI_API_KEY) {
            const OpenAI = (await import('openai')).default;
            currentOpenai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        }
        if (!currentOpenai) return res.status(500).json({ error: 'OpenAI no configurado' });

        let chatContext = '';
        // "Comprobar que la informacin del chat corresponde a este pedido y sigue siendo aplicable"
        // Since we only have the last 15 messages, we just pass them if a chat exists, and instruct the AI to check if they actually talk about this order/product.
        if (incident.chatId && incident.chatId !== 'AMBIGUOUS_MATCH') {
            const chat = db.chats.find(c => c.id === incident.chatId);
            if (chat && chat.messages) {
                chatContext = chat.messages.slice(-15).map(m => \`\${m.role === 'user' ? 'Cliente' : 'Asesor/Bot'}: \${m.body || m.content}\`).join('\\n');
            }
        }
        
        const systemPrompt = \`Eres un asistente experto en logística para e-commerce. Tu tarea es analizar el motivo de una incidencia de entrega y decidir a quién debes escribirle el borrador.

Datos del pedido:
- Cliente: \${incident.firstName} \${incident.lastName}
- Pedido: #\${incident.orderNumber}
- Motivo reportado por la transportadora: "\${incident.reason || ''}"
- Categoría: \${incident.category || 'No categorizado'}
- Aclaración previa de la transportadora (si existe): \${incident.transporterClarifications ? incident.transporterClarifications.map(c=>c.text).join(' | ') : 'Ninguna'}

Contexto reciente del chat con el cliente (evalúa si realmente están hablando de este pedido):
\${chatContext || '(No hay contexto de chat para validar)'}

REGLAS DE DECISIÓN:
1. Evalúa el "Motivo reportado". Si está VACÍO, o dice textos genéricos como "El conductor creó esta incidencia sin proporcionar detalles adicionales", o cualquier texto que NO explique qué ocurrió exactamente, el motivo es INSUFICIENTE.
2. Si existe una "Aclaración previa de la transportadora" que SÍ explica el problema, entonces el motivo pasa a ser CLARO gracias a la aclaración.
3. Si el motivo es INSUFICIENTE, genera ÚNICAMENTE un borrador dirigido al transportador (Para Soy Drop). NO debes preguntarle al cliente.
4. Si el motivo es CLARO (o hay aclaración), genera ÚNICAMENTE un borrador dirigido al cliente (Para WhatsApp). Usa el contexto del chat para no repetir preguntas.

REGLAS DEL BORRADOR SOY DROP:
- Máximo 240 caracteres.
- Breve y directo. Ejemplo: "Hola, ¿pueden indicar el motivo específico de esta incidencia y qué información necesitan para gestionar la entrega?".

REGLAS DEL BORRADOR WHATSAPP:
- Breve, amable, natural, en español, 2-3 párrafos cortos.
- Si no responden, pregunta cuándo pueden atender al transportador.
- NO inventes datos ni prometas fechas.
- Si el contexto del chat revela que el cliente ya dio una solución (ej. dio otra dirección), confírmalo en vez de pedirlo de nuevo.

RESPONDE ÚNICAMENTE CON UN JSON EN ESTE FORMATO:
{
  "isReasonSufficient": true/false,
  "draftSoyDrop": "texto o null",
  "draftWhatsApp": "texto o null",
  "reasoning": "Breve explicación de tu decisión"
}\`;

        const response = await currentOpenai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: systemPrompt }],
            response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0].message.content);
        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to generate draft' });
    }
});`;

if (content.match(targetRegex)) {
    content = content.replace(targetRegex, newEndpoint);
    
    // Also update the PUT endpoint to accept multiple drafts
    const putRegex = /app\.put\('\/api\/incidents\/:id\/draft', \(req, res\) => \{[\s\S]*?res\.status\(404\)\.json\(\{ error: 'Not found' \}\);\s*\}\s*\}\);/m;
    const newPut = `app.put('/api/incidents/:id/draft', (req, res) => {
    const { id } = req.params;
    const { draftMessage, draftSoyDrop, transporterClarification } = req.body;
    
    const idx = incidents.findIndex(i => i.id === id);
    if (idx !== -1) {
        if (draftMessage !== undefined) incidents[idx].draftMessage = draftMessage;
        if (draftSoyDrop !== undefined) incidents[idx].draftSoyDrop = draftSoyDrop;
        
        if (transporterClarification) {
            if (!incidents[idx].transporterClarifications) incidents[idx].transporterClarifications = [];
            incidents[idx].transporterClarifications.push({
                text: transporterClarification,
                date: new Date().toISOString(),
                source: 'Manual'
            });
        }
        
        saveIncidents(incidents);
        io.emit('incidents_updated', incidents);
        res.json({ success: true, incident: incidents[idx] });
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});`;
    
    if (content.match(putRegex)) {
        content = content.replace(putRegex, newPut);
        fs.writeFileSync('server/index.js', content);
        console.log("Patched server/index.js backend logic for Phase 2 updates");
    } else {
        console.log("PUT endpoint not found!");
    }
} else {
    console.log("POST generate endpoint not found!");
}
