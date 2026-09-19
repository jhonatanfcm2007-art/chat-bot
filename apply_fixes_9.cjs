const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

const migrationCode = `
// MIGRACIÓN DE PROMPT: Añadir reglas de envío de fotos e interés si no existen
let settingsModified = false;
Object.keys(settings).forEach(line => {
    if (settings[line].systemPrompt && !settings[line].systemPrompt.includes('[ENVIAR_FOTO]')) {
        settings[line].systemPrompt += \`\\n\\n### ETIQUETAS ESPECIALES OBLIGATORIAS:\\n- Si el cliente te pide fotos, imágenes o resultados del producto, debes incluir la etiqueta [ENVIAR_FOTO] en tu respuesta para que el sistema le envíe la foto automáticamente.\\n- Tan pronto como identifiques qué combo o producto le interesa al cliente (incluso antes de que confirme el pedido), incluye la etiqueta [INTERES: NombreDelCombo] (ejemplo: [INTERES: Combo 2 Tarros]). Si cambia de opinión, envíala de nuevo con el nuevo interés.\`;
        settingsModified = true;
    }
    if (settings[line].systemPrompt && settings[line].systemPrompt.includes('[PRODUCTOS: 1 Frasco Shilajit]')) {
        settings[line].systemPrompt = settings[line].systemPrompt.replace(/\\[PRODUCTOS: 1 Frasco Shilajit\\]/g, "[PRODUCTOS: Shilajit x1]");
        settings[line].systemPrompt = settings[line].systemPrompt.replace(/\\[INTERES: Combo 2 Tarros\\]/g, "[INTERES: Shilajit x2]");
        settings[line].systemPrompt = settings[line].systemPrompt.replace(/\\[INTERES: NombreDelCombo\\]/g, "[INTERES: NombreExactoDelProducto xCantidad]");
        settingsModified = true;
    }
});
if (settingsModified) saveSettings(settings);

let kbModified = false;
knowledgeBaseDb.forEach(p => {
    if (p.name && p.name.toLowerCase().includes('neuropathy')) {
        if (!p.keywords) p.keywords = [];
        if (!p.keywords.includes('neurophaty')) p.keywords.push('neurophaty');
        if (!p.keywords.includes('neuro')) p.keywords.push('neuro');
        kbModified = true;
    }
});
if (kbModified) saveKnowledgeBase(knowledgeBaseDb);
`;

c = c.replace(
    /\/\/ MIGRACI[^]*?if \(settingsModified\) saveSettings\(settings\);/m,
    migrationCode
);

fs.writeFileSync('server/index.js', c);
