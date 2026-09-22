import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const regex = /const hash = \`\$\{chat\.messages\?\.length \|\| 0\}-\$\{chat\.updatedAt \|\| 0\}-\$\{chat\.tags\?\.length \|\| 0\}/;
const replacement = "const hash = `${chat.messages?.length || 0}-${chat.updatedAt || 0}-${chat.tags?.join(',') || ''}";

if (content.match(regex)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('server/index.js', content);
    console.log("Chat hash function fixed");
} else {
    console.log("Regex not found");
}
