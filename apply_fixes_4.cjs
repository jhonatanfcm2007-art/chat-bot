const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');
c = c.replace('// Funciones seguras de guardado atómico\r\nlet isChatsSaving = false;', '// Funciones seguras de guardado atómico');
c = c.replace('// Funciones seguras de guardado atómico\nlet isChatsSaving = false;', '// Funciones seguras de guardado atómico');
c = c.replace('// Funciones seguras de guardado at\ufffdmico\r\nlet isChatsSaving = false;', '// Funciones seguras de guardado at\ufffdmico');
c = c.replace('// Funciones seguras de guardado at\ufffdmico\nlet isChatsSaving = false;', '// Funciones seguras de guardado at\ufffdmico');

// A better way is just replacing the first occurrence of "let isChatsSaving = false;"
c = c.replace('let isChatsSaving = false;', '');

fs.writeFileSync('server/index.js', c);
