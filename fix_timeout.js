import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// Revert previous bad replacement
content = content.replace(/const comp = await activeOpenAI\.chat\.completions\.create\(\{ timeout: 15000,/g, 'const comp = await activeOpenAI.chat.completions.create({');

// Apply correct replacement
const target = `                { role: "user", content: message }
            ]
        });`;
const correct = `                { role: "user", content: message }
            ]
        }, { timeout: 15000 });`;

content = content.replace(target, correct);
fs.writeFileSync('server/index.js', content);
