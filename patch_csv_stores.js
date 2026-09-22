import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// CSV Export fix
const csvTarget = `        csvContent += \`"\$\{prodName\}","\$\{qty\}","\$\{precio\}","\$\{nombre\}","\$\{apellido\}","","\$\{areaCode\}","\$\{phoneNum\}","\$\{dep\}","\$\{ciudad\}","\$\{dir\}","\$\{ref\}","\$\{notas\}"\\n\`;`;
const csvFix = `        let finalDropiId = prodName;
        const kbProd = knowledgeBaseDb.find(p => p.id === chat.assignedProductId) || knowledgeBaseDb.find(p => p.name === prodName);
        if (kbProd) {
            finalDropiId = kbProd.id;
            if (kbProd.priceVariations) {
                const variation = kbProd.priceVariations.find(v => v.prefix && (rawPhone.startsWith(v.prefix.replace(/\\D/g, '')) || areaCode.includes(v.prefix.replace(/\\D/g, ''))));
                if (variation && variation.dropiId) {
                    finalDropiId = variation.dropiId;
                }
            }
        }
        csvContent += \`"\$\{finalDropiId\}","\$\{qty\}","\$\{precio\}","\$\{nombre\}","\$\{apellido\}","","\$\{areaCode\}","\$\{phoneNum\}","\$\{dep\}","\$\{ciudad\}","\$\{dir\}","\$\{ref\}","\$\{notas\}"\\n\`;`;
content = content.replace(csvTarget, csvFix);


// Stores fix: if they enter "9900" as storeId, it might match the name of the store if ID is timestamp
const storeTarget = `const store = storesDb.find(s => s.id === targetStoreId);`;
const storeFix = `const store = storesDb.find(s => s.id === targetStoreId || s.name === targetStoreId);`;
content = content.replace(storeTarget, storeFix);

fs.writeFileSync('server/index.js', content);
console.log("Patched CSV and Stores");
