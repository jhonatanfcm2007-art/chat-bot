import fs from 'fs';
let content = fs.readFileSync('playwright-service/index.js', 'utf8');

content = content.replace("app.listen(PORT, () => {", "app.listen(PORT, '::', () => {");

fs.writeFileSync('playwright-service/index.js', content);
console.log("Updated port binding to ::");
