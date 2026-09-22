import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const targetCode = `    const prodsMatch = cleanAiReply.match(/\\[PRODUCTOS:(.+?)\\]/i);
    
    // Si la IA ya defini[oó] los productos finales, actualizamos la interfaz con esos
    if \\(prodsMatch\\) \\{
        refreshedChat.pendingApprovalProducts = cleanVal\\(prodsMatch\\[1\\]\\) \\|\\| refreshedChat.pendingApprovalProducts;
    \\}`;

const fixCode = `    const prodsMatch = cleanAiReply.match(/\\[PRODUCTOS:(.+?)\\]/i);
    
    // Si la IA ya definió los productos finales, actualizamos la interfaz con esos
    if (prodsMatch) {
        let rawProducts = cleanVal(prodsMatch[1]);
        
        // INTERCEPTAR Y TRADUCIR EL ID AL NOMBRE VISUAL PARA LA UI
        const idMatch = rawProducts.match(/(\\d{4,})/);
        if (idMatch) {
             const foundKb = knowledgeBaseDb.find(p => p.id === idMatch[1] || String(p.id) === idMatch[1]);
             if (foundKb) {
                 refreshedChat.assignedProductId = foundKb.id;
                 refreshedChat.assignedProduct = foundKb.name;
                 rawProducts = rawProducts.replace(idMatch[1], foundKb.name);
             }
        }
        
        refreshedChat.pendingApprovalProducts = rawProducts || refreshedChat.pendingApprovalProducts;
    }`;

// Since there are special chars like ó, let's use regex match replacing just the if block
const regexBlock = /const prodsMatch = cleanAiReply\.match\(\/\\\[PRODUCTOS:\(\.\+\?\)\\\]\/i\);\s*\/\/\ Si la IA ya defini[^\n]+\n\s*if \(prodsMatch\) \{\s*refreshedChat\.pendingApprovalProducts = cleanVal\(prodsMatch\[1\]\) \|\| refreshedChat\.pendingApprovalProducts;\s*\}/s;

if (content.match(regexBlock)) {
    content = content.replace(regexBlock, fixCode);
    fs.writeFileSync('server/index.js', content);
    console.log("Patched translation of ID to Name");
} else {
    console.log("Regex didn't match!");
}
