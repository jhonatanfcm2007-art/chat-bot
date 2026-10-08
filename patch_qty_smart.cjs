const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const regex = /\/\/ Extraer la cantidad del texto del producto[\s\S]*?if \(foundPrice !== null && !isNaN\(foundPrice\)\) \{\s*unitPriceVal = foundPrice \/ orderQty;\s*\}\s*\}/;

const replacement = `// ------------------ NUEVO PARSEADOR INTELIGENTE DE PRECIOS Y CANTIDADES ------------------
        let orderQty = 1;
        let unitPriceVal = 155.00; // Fallback estricto

        const parseSafePrice = (str) => {
            let clean = String(str).trim().replace(/[^0-9.,]/g, '');
            if (!clean) return 0;
            const lastComma = clean.lastIndexOf(',');
            const lastDot = clean.lastIndexOf('.');
            if (lastComma !== -1 && lastDot !== -1) {
                if (lastComma > lastDot) clean = clean.replace(/\\./g, '').replace(',', '.');
                else clean = clean.replace(/,/g, '');
            } else if (lastComma !== -1) {
                if (clean.length - 1 - lastComma === 3) clean = clean.replace(/,/g, '');
                else clean = clean.replace(',', '.');
            } else if (lastDot !== -1) {
                if (clean.length - 1 - lastDot === 3) clean = clean.replace(/\\./g, '');
            }
            return parseFloat(clean);
        };

        if (targetPricesText) {
            // Paso 1: Mapear todas las opciones disponibles en el catálogo
            const options = [];
            const lines = targetPricesText.split('\\n');
            for (const line of lines) {
                const pMatch = line.match(/(?:Q|L|\\$|₡|C\\$|C|RD\\$|S\\/)\\s*([0-9.,]+)/i);
                if (pMatch) {
                    let price = parseSafePrice(pMatch[1]);
                    let qty = 1;
                    const promoMatch = line.match(/\\b([1-9]\\d*)\\s*x\\s*[1-9]\\d*\\b/i);
                    if (promoMatch) {
                        qty = parseInt(promoMatch[1], 10);
                    } else {
                        const qMatch = line.match(/(?:\\s+x\\s*|combo\\s*|pack\\s*|lleva\\s*)([1-9]\\d*)/i) || 
                                       line.match(/\\b([1-9]\\d*)\\s*(?:frasco|tarro|unidad|unidades|combo|crema|caja|botella|pz|pieza)/i) ||
                                       line.match(/x\\s*([1-9]\\d*)$/i) ||
                                       line.match(/\\b([1-9]\\d*)\\s*x\\b/i) ||
                                       line.match(/^([1-9]\\d*)\\s+/);
                        if (qMatch && qMatch[1]) qty = parseInt(qMatch[1], 10);
                    }
                    options.push({ price, qty, lineText: line });
                }
            }

            // Paso 2: Intentar deducir la cantidad basándonos en el texto de "products" devuelto por la IA
            let aiQty = null;
            const aiPromo = products.match(/\\b([1-9]\\d*)\\s*x\\s*[1-9]\\d*\\b/i);
            if (aiPromo) aiQty = parseInt(aiPromo[1], 10);
            else {
                const aiQMatch = products.match(/(?:\\s+x\\s*|combo\\s*|pack\\s*)([1-9]\\d*)/i) || 
                                 products.match(/\\b([1-9]\\d*)\\s*(?:frasco|tarro|unidad|unidades|combo|crema|caja|botella|pz|pieza)/i) ||
                                 products.match(/x\\s*([1-9]\\d*)$/i) ||
                                 products.match(/\\b([1-9]\\d*)\\s*x\\b/i) ||
                                 products.match(/^([1-9]\\d*)\\s+/);
                if (aiQMatch && aiQMatch[1]) aiQty = parseInt(aiQMatch[1], 10);
            }

            // Paso 3: Ver si la IA mencionó el precio total en el último mensaje para confirmar
            let matchedOption = null;
            const lastBotMsg = chat && chat.messages ? chat.messages.slice().reverse().find(m => m.isMe) : null;
            if (lastBotMsg && options.length > 0) {
                const botText = (lastBotMsg.body || lastBotMsg.content || '').replace(/[^0-9.,]/g, ' ');
                // Buscar si alguno de nuestros precios aparece en el último mensaje del bot
                for (const opt of options) {
                    if (botText.includes(Math.floor(opt.price).toString())) {
                        matchedOption = opt;
                        break;
                    }
                }
            }

            // Paso 4: Toma de decisión
            if (matchedOption) {
                orderQty = matchedOption.qty;
                unitPriceVal = matchedOption.price / orderQty;
            } else if (aiQty !== null && options.length > 0) {
                // Si no pudimos confirmar por precio, cruzamos la cantidad que dijo la IA con nuestras opciones
                const optByQty = options.find(o => o.qty === aiQty);
                if (optByQty) {
                    orderQty = optByQty.qty;
                    unitPriceVal = optByQty.price / orderQty;
                } else if (aiQty === 1) {
                    // Cuidado: Si la IA dice "1" pero no hay opción "1" (ej. el catálogo solo vende 2x1), 
                    // asumimos la primera opción disponible.
                    orderQty = options[0].qty;
                    unitPriceVal = options[0].price / orderQty;
                } else {
                    orderQty = aiQty;
                    unitPriceVal = options[0].price / orderQty;
                }
            } else if (options.length > 0) {
                // Fallback total: usar la primera opción del catálogo
                orderQty = options[0].qty;
                unitPriceVal = options[0].price / orderQty;
            }
        }`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('server/index.js', code);
    console.log("Patched qty parsing!");
} else {
    console.log("Target not found!");
}
