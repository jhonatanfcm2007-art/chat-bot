import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const shopifyTarget = `const searchName = chat.assignedProduct || products || '';`;
// I already replaced it for Shopify, wait! 
// Let's just find BOTH occurrences of createDropiOrder and createShopifyOrder logic.
const regexSearchName = /const searchName = chat\.assignedProduct \|\| products \|\| '';(?!\n\s*const idMatch)/g;
content = content.replace(regexSearchName, `const searchName = chat.assignedProduct || products || '';
    const idMatch = products ? products.match(/(\\d{4,})/) : null;
    const aiProductId = idMatch ? idMatch[1] : null;`);

const regexProdDropi = /let prod = null;\s*\/\/\ 1\.\ B[^\n]+\n\s*if \(chat\.assignedProductId\) \{\s*prod = knowledgeBaseDb\.find\(p => p\.id === chat\.assignedProductId\);\s*\}/g;
const shopifyProdFix = `    let prod = null;
    // 1. Búsqueda por ID exacto (Prioridad absoluta desde Anuncios o IA)
    if (aiProductId) {
        prod = knowledgeBaseDb.find(p => p.id === aiProductId || String(p.id) === String(aiProductId));
    }
    if (!prod && chat.assignedProductId) {
        prod = knowledgeBaseDb.find(p => p.id === chat.assignedProductId);
    }`;

content = content.replace(regexProdDropi, shopifyProdFix);

fs.writeFileSync('server/index.js', content);
console.log("Patched createDropiOrder as well");
