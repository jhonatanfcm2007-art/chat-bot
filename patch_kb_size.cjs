const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const target = "app.get('/api/debug/chat',";
const replacement = `app.get('/api/debug/kb-size', (req, res) => {
    res.json({ count: knowledgeBaseDb.length, size: JSON.stringify(knowledgeBaseDb).length });
});
app.get('/api/debug/chat',`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('server/index.js', code);
    console.log("Patched kb-size endpoint!");
} else {
    console.log("Target not found");
}
