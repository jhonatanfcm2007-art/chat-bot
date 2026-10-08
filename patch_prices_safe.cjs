const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const regex = /if \(matchedVar && matchedVar\.prices\) \{[\s\S]*?\}\s*\}/;

const replacement = `if (matchedVar && matchedVar.prices) {
                        const hasNumbers = /\\d/.test(matchedVar.prices);
                        if (hasNumbers) {
                            finalPrices = matchedVar.prices;
                            // BORRAMOS físicamente cualquier precio hardcodeado solo si la variación de país tiene precios reales numéricos
                            detailsText = detailsText.replace(/[LQC\\$]\\s*\\.?\\s*\\d+([.,]\\d+)?/gi, "[MENCIONA AQUÍ EL PRECIO DE LA TABLA PRECIOS Y COMBOS]");
                        }
                    }
                }
                
                if (!finalPrices || !/\\d/.test(finalPrices)) {
                    finalPrices = "⚠️ ERROR: NO HAY PRECIOS CONFIGURADOS EN EL CRM. ESTÁ TOTALMENTE PROHIBIDO INVENTAR UN PRECIO, USAR DÓLARES O ADIVINAR. RESPONDE ÚNICAMENTE CON: [APAGAR_BOT_SOPORTE]";
                }`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('server/index.js', code);
    console.log("Patched price logic!");
} else {
    console.log("Not found!");
}
