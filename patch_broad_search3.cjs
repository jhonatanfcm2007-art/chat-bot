const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const regex = /const isBroadSearch = activeProducts\.length > 3 && \(\!currentChat \|\| \!currentChat\.assignedProduct\);\s*if \(isBroadSearch\) \{\s*knowledgeContext \+= "\\n⚠️ EL CLIENTE AÚN NO HA ELEGIDO UN PRODUCTO\. OFRÉCELE AMABLEMENTE LOS SIGUIENTES PRODUCTOS DISPONIBLES EN TU CATÁLOGO PARA QUE ELIJA UNO:\\n";\s*\}/g;

const replace = `const isBroadSearch = activeProducts.length > 3 && (!currentChat || (!currentChat.assignedProduct && !currentChat.assignedProductId));
            if (isBroadSearch) {
                knowledgeContext += "\\n⚠️ EL CLIENTE AÚN NO HA ELEGIDO UN PRODUCTO. Pregúntale amable y DIRECTAMENTE qué producto busca o para qué problema de salud necesita ayuda. ESTÁ ESTRICTAMENTE PROHIBIDO enviarle una lista larga con todos los productos del catálogo. Solo menciónale 2 o 3 opciones como máximo si es estrictamente necesario, o simplemente pregúntale qué busca:\\n";
            }`;

if (code.match(regex)) {
    code = code.replace(regex, replace);
    fs.writeFileSync('server/index.js', code);
    console.log('Fixed broad search hallucination');
} else {
    console.log('Regex failed, trying manual replace');
    // Manual fallback just in case
    const targetStr = 'knowledgeContext += "\\n⚠️ EL CLIENTE AÚN NO HA ELEGIDO UN PRODUCTO. OFRÉCELE AMABLEMENTE LOS SIGUIENTES PRODUCTOS DISPONIBLES EN TU CATÁLOGO PARA QUE ELIJA UNO:\\n";';
    const replaceStr = 'knowledgeContext += "\\n⚠️ EL CLIENTE AÚN NO HA ELEGIDO UN PRODUCTO. Pregúntale amable y DIRECTAMENTE qué producto busca. ESTÁ ESTRICTAMENTE PROHIBIDO enviarle una lista larga con todos los productos del catálogo a menos que él pida el catálogo expresamente:\\n";';
    code = code.replace(targetStr, replaceStr);
    
    // Also fix the assignedProductId condition
    code = code.replace('(!currentChat || !currentChat.assignedProduct)', '(!currentChat || (!currentChat.assignedProduct && !currentChat.assignedProductId))');
    
    fs.writeFileSync('server/index.js', code);
    console.log('Manual replace complete');
}
