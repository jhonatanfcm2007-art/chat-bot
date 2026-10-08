const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const target = "app.get('/api/knowledge-base',";
const replacement = `app.get('/api/debug/chat', (req, res) => {
    const phone = Object.keys(chats).find(k => chats[k].customerName && chats[k].customerName.includes('Gloria'));
    res.json(phone ? chats[phone] : {error: 'Not found'});
});
app.get('/api/knowledge-base',`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('server/index.js', code);
    console.log("Patched!");
} else {
    console.log("Not found!");
}
