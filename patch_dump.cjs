const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const regex = /app\.get\('\/api\/debug\/kb-size', \(req, res\) => \{[\s\S]*?\}\);/;
const replacement = `app.get('/api/debug/kb-size', (req, res) => {
    res.json(knowledgeBaseDb);
});`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('server/index.js', code);
    console.log("Patched!");
} else {
    console.log("Not found!");
}
