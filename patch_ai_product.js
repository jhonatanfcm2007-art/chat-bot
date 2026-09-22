import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// 1. Add ID to Knowledge Context
const contextTarget = 'knowledgeContext += `\\n--- PRODUCTO: ${prod.name} ---\\n`;';
const contextFix = 'knowledgeContext += `\\n--- PRODUCTO: ${prod.name} (ID: ${prod.id}) ---\\n`;';

if (content.includes(contextTarget)) {
    content = content.replace(contextTarget, contextFix);
}

// 2. Change Prompt instruction for [PRODUCTOS]
const promptTarget1 = '\\[ENTREGAR_AHORA\\] \\[PRODUCTOS: NombreBase xCant\\]';
const promptFix1 = '[ENTREGAR_AHORA] [PRODUCTOS: ID_NUMERICO xCant]';

const promptTarget2 = 'En \\[PRODUCTOS\\] usa ÚNICAMENTE EL NOMBRE EXACTO DEL PRODUCTO de la base de conocimiento \\(ej\\. "Neuropathy"\\) y la cantidad\\. JAMÁS inventes nombres genéricos';
const promptFix2 = 'En [PRODUCTOS] usa ESTRICTAMENTE EL ID NUMÉRICO DEL PRODUCTO que aparece al lado de su nombre en la base de conocimiento (ej. 17354920) y la cantidad. JAMÁS uses el nombre ni inventes nombres genéricos';

// Because of encoding, let's use regex
content = content.replace(/\[ENTREGAR_AHORA\]\s*\[PRODUCTOS:[^\]]+\]/g, "[ENTREGAR_AHORA] [PRODUCTOS: ID_NUMERICO xCant]");
content = content.replace(/En \[PRODUCTOS\] usa.*?catálogo\./g, "En [PRODUCTOS] usa ESTRICTAMENTE EL ID NUMÉRICO DEL PRODUCTO (ej. 170945) de la base de conocimiento y la cantidad. JAMÁS uses nombres ni palabras, SOLO EL ID NUMÉRICO.");

// 3. Modify createShopifyOrder to search by ID first from the tag
const shopifyTarget = `const searchName = chat.assignedProduct || products || '';`;
const shopifyFix = `const searchName = chat.assignedProduct || products || '';
    const idMatch = products ? products.match(/(\\d+)/) : null;
    const aiProductId = idMatch ? idMatch[1] : null;`;

if (content.includes(shopifyTarget)) {
    content = content.replace(shopifyTarget, shopifyFix);
}

const shopifyProdTarget = `    let prod = null;
    // 1. Búsqueda por ID exacto (Prioridad absoluta desde Anuncios)
    if (chat.assignedProductId) {
        prod = knowledgeBaseDb.find(p => p.id === chat.assignedProductId);
    }`;

const shopifyProdFix = `    let prod = null;
    // 1. Búsqueda por ID exacto (Prioridad absoluta desde Anuncios o IA)
    if (aiProductId) {
        prod = knowledgeBaseDb.find(p => p.id === aiProductId || String(p.id) === String(aiProductId));
    }
    if (!prod && chat.assignedProductId) {
        prod = knowledgeBaseDb.find(p => p.id === chat.assignedProductId);
    }`;

// Regex for encoding
const regexProd = /let prod = null;\s*\/\/\ 1\.\ B[^\n]+\n\s*if \(chat\.assignedProductId\) \{\s*prod = knowledgeBaseDb\.find\(p => p\.id === chat\.assignedProductId\);\s*\}/s;
if (content.match(regexProd)) {
    content = content.replace(regexProd, shopifyProdFix);
}

fs.writeFileSync('server/index.js', content);
console.log("Patched AI to use Product ID instead of Name");
