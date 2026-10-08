const fs = require('fs');
let code = fs.readFileSync('src/components/KnowledgeBase.jsx', 'utf8');

code = code.replace(
  '<option value="5">Línea 5</option>',
  '<option value="5">Línea 5</option>\n                  <option value="6">Línea 6</option>'
);

code = code.replace(
  "p.line === '5' ? 'Línea 5' : 'Ambas Líneas'",
  "p.line === '5' ? 'Línea 5' : p.line === '6' ? 'Línea 6' : 'Ambas Líneas'"
);

fs.writeFileSync('src/components/KnowledgeBase.jsx', code);
console.log('KnowledgeBase.jsx patched for Line 6');
