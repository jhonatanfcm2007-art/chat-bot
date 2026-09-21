import fs from 'fs';

let content = fs.readFileSync('server/index.js', 'utf8');

// 1. Update assignProductToChat to set chat.assignedProductId
content = content.replace(
    /chat\.assignedProduct = matched\.name;\s*return;/g,
    `chat.assignedProduct = matched.name;\n            chat.assignedProductId = matched.id;\n            return;`
);
content = content.replace(
    /chat\.assignedProduct = exclusiveProducts\[0\]\.name;\s*return;/g,
    `chat.assignedProduct = exclusiveProducts[0].name;\n            chat.assignedProductId = exclusiveProducts[0].id;\n            return;`
);

// 2. Update createShopifyOrder to prioritize chat.assignedProductId
const replaceTarget = `    // SOBRESCRIBIR con credenciales específicas del producto si existen
    const searchName = chat.assignedProduct || products || '';
    
    // FILTRAR PRIMERO POR LA LÍNEA DE WHATSAPP (Evita mezclar tiendas si hay varios productos con el mismo nombre)
    const lineProducts = knowledgeBaseDb.filter(p => {
        const pLine = p.line || '1';
        return pLine === String(waLine) || pLine === 'Ambas' || pLine === 'all';
    });

    let prod = lineProducts.find(p => p.name === searchName);`;

// Regex version since accents might differ
const createShopifyRegex = /\/\/ SOBRESCRIBIR con credenciales[\s\S]*?let prod = lineProducts\.find\(p => p\.name === searchName\);/;

if (createShopifyRegex.test(content)) {
    content = content.replace(createShopifyRegex, `    // SOBRESCRIBIR con credenciales
    const searchName = chat.assignedProduct || products || '';
    
    // FILTRAR PRIMERO POR LA LÍNEA DE WHATSAPP
    const lineProducts = knowledgeBaseDb.filter(p => {
        const pLine = p.line || '1';
        return pLine === String(waLine) || pLine === 'Ambas' || pLine === 'all';
    });

    let prod = null;
    // 1. Búsqueda por ID exacto (Prioridad absoluta desde Anuncios)
    if (chat.assignedProductId) {
        prod = knowledgeBaseDb.find(p => p.id === chat.assignedProductId);
    }
    
    // 2. Fallback a búsqueda por nombre exacto
    if (!prod) {
        prod = lineProducts.find(p => p.name === searchName);
    }`);
    fs.writeFileSync('server/index.js', content);
    console.log("createShopifyOrder patched!");
} else {
    console.log("createShopifyOrder NOT MATCHED!");
}
