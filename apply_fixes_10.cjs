const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

// Extraer el bloque kbModified
const kbBlockRegex = /let kbModified = false;[\s\S]*?if \(kbModified\) saveKnowledgeBase\(knowledgeBaseDb\);\s*/;
const match = c.match(kbBlockRegex);

if (match) {
    const kbBlock = match[0];
    c = c.replace(kbBlockRegex, '');
    
    // Insertar después de let knowledgeBaseDb = loadKnowledgeBase();
    c = c.replace(
        /let knowledgeBaseDb = loadKnowledgeBase\(\);/,
        "let knowledgeBaseDb = loadKnowledgeBase();\n\n" + kbBlock
    );
    
    fs.writeFileSync('server/index.js', c);
    console.log("Moved kbModified block successfully.");
} else {
    console.log("Could not find kbModified block.");
}
