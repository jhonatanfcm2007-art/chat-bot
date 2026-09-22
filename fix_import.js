import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

content = content.replace(/import \{ fetchIncidentHistory \} from '\.\/playwrightService\.js';\r?\n?/g, "");

fs.writeFileSync('server/index.js', content);
console.log("Fixed import issue");
