const http = require('http');

const data = JSON.stringify({
    to: '1234567890',
    content: 'test',
    imageUrl: '/uploads/1790724214867-999665288.png'
});

const req = http.request('http://localhost:3000/api/send-message', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', body);
    });
});

req.on('error', (e) => {
    console.error('Error:', e);
});

req.write(data);
req.end();
