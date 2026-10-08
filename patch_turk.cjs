const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const target = "app.get('/api/debug/kb-size', (req, res) => {";
const replacement = `app.get('/api/debug/kb-size', (req, res) => {
    const turk = knowledgeBaseDb.find(p => p.name && p.name.toLowerCase().includes('turkesteron'));
    res.json({ count: knowledgeBaseDb.length, turk });
});
app.get('/api/debug/chat_disabled', (req, res) => {`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('server/index.js', code);
    console.log("Patched kb-size endpoint to dump Turkesterona!");
} else {
    console.log("Target not found");
}
