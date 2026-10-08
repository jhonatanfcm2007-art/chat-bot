const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

code = code.replace("const axios = require('axios');", "");
code = code.replace(
    "const res = await axios.post(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`, payload);",
    "const res = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const data = await res.json(); if (!res.ok) throw new Error(JSON.stringify(data));"
);
code = code.replace("err.response ? err.response.data : err.message", "err.message");

fs.writeFileSync('server/index.js', code);
console.log('Fixed axios to fetch');
