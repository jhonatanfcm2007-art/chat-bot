const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const regex = /\} else \{\s*orderQty = aiQty;\s*unitPriceVal = options\[0\]\.price \/ orderQty;\s*\}\s*\} else if \(options\.length > 0\) \{\s*\/\/ Fallback total: usar la primera opción del catálogo\s*orderQty = options\[0\]\.qty;\s*unitPriceVal = options\[0\]\.price \/ orderQty;\s*\}\s*\}\s*const unitPrice = unitPriceVal\.toFixed\(2\);/g;

const replacement = `} else {
                    orderQty = aiQty;
                    // FIX: Si pide 6 pero la opción 0 es para 1, usar el precio de la opción 0, no dividirlo entre 6!
                    unitPriceVal = options[0].price / options[0].qty; 
                }
            } else if (options.length > 0) {
                // Fallback total: usar la primera opción del catálogo
                orderQty = options[0].qty;
                unitPriceVal = options[0].price / orderQty;
            }
            
            // BLINDAJE ANTE ALUCINACIONES: Asegurar que el precio unitario a enviar a Shopify JAMÁS sea menor al precio unitario más barato del CRM.
            if (options.length > 0) {
                const minAllowedUnitPrice = Math.min(...options.map(o => o.price / o.qty));
                if (unitPriceVal < minAllowedUnitPrice) {
                    console.log(\`🛡️ [BLINDAJE] Precio inferido (\${unitPriceVal}) es menor al mínimo permitido (\${minAllowedUnitPrice}). Corrigiendo.\`);
                    unitPriceVal = minAllowedUnitPrice;
                }
            }
        }
        
        const unitPrice = unitPriceVal.toFixed(2);`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('server/index.js', code);
    console.log("Patched Shopify smart pricing logic and added shield!");
} else {
    console.log("Could not find regex match!");
}
