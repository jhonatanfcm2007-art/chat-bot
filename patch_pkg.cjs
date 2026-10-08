const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts.start = "node server/index.js";
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log("Patched package.json start script!");
