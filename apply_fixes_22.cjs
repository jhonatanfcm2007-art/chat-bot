const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

const target = `                knowledgeContext += \`Detalles y Beneficios:\\n\${prod.details}\\n\`;
                
                // Procesar variaciones de precios según el número de teléfono del cliente
                let finalPrices = prod.prices;
                if (prod.priceVariations && prod.priceVariations.length > 0) {
                    const cleanPhone = String(fromPhone).split('_')[0].replace(/\\D/g, ''); // Remover sufijos de línea y caracteres no numéricos
                    const matchedVar = prod.priceVariations.find(v => {
                        const cleanPrefix = (v.prefix || '').replace(/\\D/g, '');
                        return cleanPrefix && cleanPhone.startsWith(cleanPrefix);
                    });
                    if (matchedVar && matchedVar.prices) {
                        finalPrices = matchedVar.prices;
                    }
                }
                knowledgeContext += \`Precios y Combos:\\n\${finalPrices}\\n\`;`;

// Usamos el código de reemplazo
const replacement = `                let detailsText = prod.details || '';
                let finalPrices = prod.prices;
                
                // Procesar variaciones de precios según el número de teléfono del cliente
                if (prod.priceVariations && prod.priceVariations.length > 0) {
                    const cleanPhone = String(fromPhone).split('_')[0].replace(/\\D/g, ''); 
                    const matchedVar = prod.priceVariations.find(v => {
                        const cleanPrefix = (v.prefix || '').replace(/\\D/g, '');
                        return cleanPrefix && cleanPhone.startsWith(cleanPrefix);
                    });
                    if (matchedVar && matchedVar.prices) {
                        finalPrices = matchedVar.prices;
                        // BORRAMOS físicamente cualquier precio hardcodeado (Lempiras, Quetzales, Córdobas, Dólares) 
                        // del guion de ventas para que la IA nunca vea la moneda del otro país.
                        detailsText = detailsText.replace(/[LQC\\$]\\s*\\.?\\s*\\d+([.,]\\d+)?/gi, "[MENCIONA AQUÍ EL PRECIO DE LA TABLA PRECIOS Y COMBOS]");
                    }
                }
                
                knowledgeContext += \`Detalles y Beneficios:\\n\${detailsText}\\n\`;
                knowledgeContext += \`Precios y Combos:\\n\${finalPrices}\\n\`;`;

// Because of encoding differences (según vs segǧn), let's use a regex replace
const regex = /knowledgeContext \+= `Detalles y Beneficios:\\n\$\{prod\.details\}\\n`;[\s\S]*?knowledgeContext \+= `Precios y Combos:\\n\$\{finalPrices\}\\n`;/s;

if (regex.test(c)) {
    c = c.replace(regex, replacement);
    fs.writeFileSync('server/index.js', c);
    console.log("Inyección exitosa de la limpieza física de precios.");
} else {
    console.log("No se encontró el bloque a reemplazar.");
}
