import fs from 'fs';
let content = fs.readFileSync('src/components/Incidents.jsx', 'utf8');

// The file literally contains \` and \${
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');

fs.writeFileSync('src/components/Incidents.jsx', content);
console.log("Incidents.jsx syntax fixed");
