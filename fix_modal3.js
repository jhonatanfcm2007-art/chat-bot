import fs from 'fs';
let content = fs.readFileSync('src/components/Incidents.jsx', 'utf8');

const errorBlock = `{selectedIncident && (`;
const fixBlock = `            )}\n            {selectedIncident && (`;

content = content.replace(errorBlock, fixBlock);
fs.writeFileSync('src/components/Incidents.jsx', content);
console.log("Fixed JSX ternary operator closing");
