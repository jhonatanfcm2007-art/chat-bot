import fs from 'fs';

let content = fs.readFileSync('server/index.js', 'utf8');

const target = `    const hasOrderTag = /\\[ENTREGAR_AHORA\\]/i.test(cleanAiReply);
    const hasConfirmacionRetenida = /\\[CONFIRMACION_RETENIDA\\]/i.test(cleanAiReply);`;

const replacement = `    // Fallback por si la IA alucina el resumen en Markdown en lugar de usar etiquetas ocultas
    if (!/\\[ENTREGAR_AHORA\\]/i.test(cleanAiReply) && /\\*\\*Nombre\\*\\*:/i.test(cleanAiReply) && /\\*\\*(Producto|Productos)\\*\\*:/i.test(cleanAiReply)) {
        const fbProd = cleanAiReply.match(/\\*\\*(?:Producto|Productos)\\*\\*:\\s*(.+)/i);
        const fbName = cleanAiReply.match(/\\*\\*Nombre\\*\\*:\\s*(.+)/i);
        const fbPhone = cleanAiReply.match(/\\*\\*(?:Teléfono|Telefono|Tel)\\*\\*:\\s*(.+)/i);
        const fbDir = cleanAiReply.match(/\\*\\*(?:Dirección|Direccion)\\*\\*:\\s*(.+)/i);
        const fbMun = cleanAiReply.match(/\\*\\*(?:Municipio|Ciudad)\\*\\*:\\s*(.+)/i);
        const fbDep = cleanAiReply.match(/\\*\\*(?:Departamento|Provincia|Estado)\\*\\*:\\s*(.+)/i);
        
        if (fbProd && fbName && fbDir) {
            cleanAiReply += \` [ENTREGAR_AHORA] [PRODUCTOS: \${fbProd[1]}] [NOMBRE: \${fbName[1]}] [TELEFONO: \${fbPhone ? fbPhone[1] : ''}] [DIRECCION: \${fbDir[1]}] [MUNICIPIO: \${fbMun ? fbMun[1] : ''}] [DEPARTAMENTO: \${fbDep ? fbDep[1] : ''}]\`;
            console.log("Y' [SISTEMA] Fallback de etiquetas aplicado desde Markdown");
        }
    }

    const hasOrderTag = /\\[ENTREGAR_AHORA\\]/i.test(cleanAiReply);
    const hasConfirmacionRetenida = /\\[CONFIRMACION_RETENIDA\\]/i.test(cleanAiReply);`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('server/index.js', content);
    console.log("Fallback injected!");
} else {
    console.log("Target not found!");
}
