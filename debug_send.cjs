const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const target = "app.post('/api/send-message', async (req, res) => {";
const replace = `app.post('/api/send-message', async (req, res) => {
    console.log('[API SEND-MESSAGE] payload received:', { to: req.body.to, hasImage: !!req.body.imageUrl, imageUrl: req.body.imageUrl, hasContent: !!req.body.content });
`;

if (code.includes(target) && !code.includes('[API SEND-MESSAGE] payload received')) {
    code = code.replace(target, replace);
    fs.writeFileSync('server/index.js', code);
    console.log('Added log to /api/send-message');
} else {
    console.log('Already added or target not found');
}
