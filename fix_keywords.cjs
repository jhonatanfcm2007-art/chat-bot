const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

c = c.replace(/prod = lineProducts\.find\(p => \{\s+if \(!p\.name\) return false;\s+const lowerKBName = p\.name\.toLowerCase\(\);\s+const lowerSearchName = searchName\.toLowerCase\(\);\s+return lowerSearchName\.includes\(lowerKBName\) \|\| lowerKBName\.includes\(lowerSearchName\);\s+\}\);/,
`prod = lineProducts.find(p => {
            if (!p.name) return false;
            const lowerKBName = p.name.toLowerCase();
            const lowerSearchName = searchName.toLowerCase();
            const nameMatch = lowerSearchName.includes(lowerKBName) || lowerKBName.includes(lowerSearchName);
            const kwMatch = p.keywords && p.keywords.some(kw => {
                const lowerKw = kw.toLowerCase().trim();
                return lowerSearchName.includes(lowerKw) || lowerKw.includes(lowerSearchName);
            });
            return nameMatch || kwMatch;
        });`);

c = c.replace(/prod = knowledgeBaseDb\.find\(p => \{\s+if \(!p\.name\) return false;\s+const lowerKBName = p\.name\.toLowerCase\(\);\s+const lowerSearchName = searchName\.toLowerCase\(\);\s+return lowerSearchName\.includes\(lowerKBName\) \|\| lowerKBName\.includes\(lowerSearchName\);\s+\}\);/,
`prod = knowledgeBaseDb.find(p => {
                if (!p.name) return false;
                const lowerKBName = p.name.toLowerCase();
                const lowerSearchName = searchName.toLowerCase();
                const nameMatch = lowerSearchName.includes(lowerKBName) || lowerKBName.includes(lowerSearchName);
                const kwMatch = p.keywords && p.keywords.some(kw => {
                    const lowerKw = kw.toLowerCase().trim();
                    return lowerSearchName.includes(lowerKw) || lowerKw.includes(lowerSearchName);
                });
                return nameMatch || kwMatch;
            });`);

fs.writeFileSync('server/index.js', c);
