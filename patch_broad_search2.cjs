const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const regex = /if \(activeProducts\.length > 0\) \{\s*activeProducts\.forEach\(prod => \{\s*knowledgeContext \+= `\\n--- PRODUCTO: \$\{prod\.name\} \(ID: \$\{prod\.id\}\) ---\\n`;[\s\S]*?let finalPrices = prod\.prices;/;

const replacement = `if (activeProducts.length > 0) {
            const isBroadSearch = activeProducts.length > 3 && (!currentChat || !currentChat.assignedProduct);
            if (isBroadSearch) {
                knowledgeContext += "\\n⚠️ EL CLIENTE AÚN NO HA ELEGIDO UN PRODUCTO. OFRÉCELE AMABLEMENTE LOS SIGUIENTES PRODUCTOS DISPONIBLES EN TU CATÁLOGO PARA QUE ELIJA UNO:\\n";
            }

            activeProducts.forEach(prod => {
                knowledgeContext += \`\\n--- PRODUCTO: \${prod.name} (ID: \${prod.id}) ---\\n\`;
                if (prod.keywords && prod.keywords.length > 0) {
                    knowledgeContext += \`Palabras clave para activar: \${prod.keywords.join(', ')}\\n\`;
                }
                
                if (isBroadSearch) {
                    knowledgeContext += "Menciónale este producto.\\n";
                    return; // SALTA DETALLES COMPLETOS PARA AHORRAR TOKENS
                }

                if (prod.adIds && prod.adIds.length > 0) {
                    knowledgeContext += \`IDs de Anuncio asociados: \${prod.adIds.join(', ')}\\n\`;
                }
                let detailsText = prod.details || '';
                let finalPrices = prod.prices;`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('server/index.js', code);
    console.log("Patched via regex!");
} else {
    console.log("Regex not found!");
}
