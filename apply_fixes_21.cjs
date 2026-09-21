const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

const regex = /\/\/ Emit updated chats to clients so the UI updates in real-time\s+if \(typeof io !== 'undefined'\) \{\s+io\.emit\('initial_state', \{\s+chats,\s+settings,\s+accounts,\s+products: productsDb,\s+globalRules,\s+knowledgeBase: knowledgeBaseDb,\s+customers: customersDb\s+\}\);\s+\}/;

const replacement = `// Removemos el emit incorrecto porque las variables accounts, productsDb, customersDb no existen en el backend`;

if (regex.test(c)) {
    c = c.replace(regex, replacement);
    fs.writeFileSync('server/index.js', c);
    console.log("Inyección exitosa: Se eliminó el io.emit que causaba el crash.");
} else {
    console.log("No se encontró el bloque a reemplazar.");
}
