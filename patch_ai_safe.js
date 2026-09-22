import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// 1. Add ID to Knowledge Context
const contextTarget = 'knowledgeContext += `\\n--- PRODUCTO: ${prod.name} ---\\n`;';
const contextFix = 'knowledgeContext += `\\n--- PRODUCTO: ${prod.name} (ID: ${prod.id}) ---\\n`;';

if (content.includes(contextTarget)) {
    content = content.replace(contextTarget, contextFix);
}

// 2. Change specific prompt parts safely
content = content.replace(/\[ENTREGAR_AHORA\] \[PRODUCTOS: NombreBase xCant\]/g, "[ENTREGAR_AHORA] [PRODUCTOS: ID_DEL_PRODUCTO xCant]");

const targetPrompt = `En [PRODUCTOS] usa sNICAMENTE EL NOMBRE EXACTO DEL PRODUCTO de la base de conocimiento (ej. "Neuropathy") y la cantidad. JAM?S inventes nombres genǸricos como "crema" o "combo de 2 cremas" si no se llaman as en tu catǭlogo.`;

// Due to weird encoding, we will use a loose regex for the text "En [PRODUCTOS] usa" up to "en tu cat"
const regexPrompt = /En \[PRODUCTOS\] usa.*?(en tu cat.*?[oó])/s;
if (content.match(regexPrompt)) {
    content = content.replace(regexPrompt, `En [PRODUCTOS] usa ESTRICTAMENTE EL ID NUMÉRICO DEL PRODUCTO (ej. 170945) de la base de conocimiento y la cantidad. JAMÁS uses nombres ni palabras, SOLO EL ID NUMÉRICO`);
}

const shopifyTarget = `const searchName = chat.assignedProduct || products || '';`;
const shopifyFix = `const searchName = chat.assignedProduct || products || '';
    const idMatch = products ? products.match(/(\\d{4,})/) : null;
    const aiProductId = idMatch ? idMatch[1] : null;`;

if (content.includes(shopifyTarget)) {
    content = content.replace(shopifyTarget, shopifyFix);
}

const shopifyProdTarget = `    let prod = null;
    // 1. Bǧsqueda por ID exacto (Prioridad absoluta desde Anuncios)`;
    
// We will replace the whole block manually with regex
const regexProd = /let prod = null;\s*\/\/\ 1\.\ B[^\n]+\n\s*if \(chat\.assignedProductId\) \{\s*prod = knowledgeBaseDb\.find\(p => p\.id === chat\.assignedProductId\);\s*\}/s;
const shopifyProdFix = `    let prod = null;
    // 1. Búsqueda por ID exacto (Prioridad absoluta desde Anuncios o IA)
    if (aiProductId) {
        prod = knowledgeBaseDb.find(p => p.id === aiProductId || String(p.id) === String(aiProductId));
    }
    if (!prod && chat.assignedProductId) {
        prod = knowledgeBaseDb.find(p => p.id === chat.assignedProductId);
    }`;

if (content.match(regexProd)) {
    content = content.replace(regexProd, shopifyProdFix);
}

fs.writeFileSync('server/index.js', content);
console.log("Safely patched AI to use Product ID");
