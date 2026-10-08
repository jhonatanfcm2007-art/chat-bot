const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const regex = /if \(currentChat && currentChat\.assignedProduct\) \{\s*const targetProdLower = currentChat\.assignedProduct\.toLowerCase\(\)\.replace\(\/\\s\*x\\s\*\\d\+\$\/i, ''\)\.trim\(\);\s*\/\/ Buscar primero en la línea actual\s*let assignedProd = lineProducts\.find\(p => p\.name\.toLowerCase\(\)\.includes\(targetProdLower\) \|\| targetProdLower\.includes\(p\.name\.toLowerCase\(\)\)\);\s*\/\/ Si no está en la línea actual.*\s*\/\/ buscarlo en toda la base de datos.*\s*if \(!assignedProd\) \{\s*assignedProd = knowledgeBaseDb\.find\(p => p\.name\.toLowerCase\(\)\.includes\(targetProdLower\) \|\| targetProdLower\.includes\(p\.name\.toLowerCase\(\)\)\);\s*\}/;

const replacement = `if (currentChat && currentChat.assignedProduct) {
            let assignedProd = null;
            // Prioridad 1: Búsqueda exacta por ID si existe
            if (currentChat.assignedProductId) {
                assignedProd = knowledgeBaseDb.find(p => p.id === currentChat.assignedProductId);
            }
            
            // Prioridad 2: Búsqueda por nombre (fallback)
            if (!assignedProd) {
                const targetProdLower = currentChat.assignedProduct.toLowerCase().replace(/\\s*x\\s*\\d+$/i, '').trim();
                assignedProd = lineProducts.find(p => p.name.toLowerCase() === targetProdLower) || 
                               lineProducts.find(p => p.name.toLowerCase().includes(targetProdLower) || targetProdLower.includes(p.name.toLowerCase()));
                
                if (!assignedProd) {
                    assignedProd = knowledgeBaseDb.find(p => p.name.toLowerCase() === targetProdLower) || 
                                   knowledgeBaseDb.find(p => p.name.toLowerCase().includes(targetProdLower) || targetProdLower.includes(p.name.toLowerCase()));
                }
            }`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('server/index.js', code);
    console.log("Patched assignedProduct logic to use ID!");
} else {
    console.log("Could not find regex for assignedProduct logic");
}
