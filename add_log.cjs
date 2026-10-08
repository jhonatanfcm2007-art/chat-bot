const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');
code = code.replace("app.post('/api/upload', (req, res) => {", "app.post('/api/upload', (req, res) => { console.log('[API UPLOAD] Hit!');");
fs.writeFileSync('server/index.js', code);
console.log('Added log');
