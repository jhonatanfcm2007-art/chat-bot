import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const targetLimit = `app.use(express.json({ 
    limit: '50mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));`;

const fixLimit = `app.use(express.json({ 
    limit: '150mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));`;

if (content.includes("limit: '50mb',")) {
    content = content.replace(targetLimit, fixLimit);
    fs.writeFileSync('server/index.js', content);
    console.log("Patched server limit");
} else {
    console.log("Target not found in server");
}
