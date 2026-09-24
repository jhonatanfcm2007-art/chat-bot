import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// The regex might have corrupted characters due to encoding (''' which is ₡)
// Let's replace the raw string cautiously.

content = content.replace(
    /line\.match\(\/\(\?:Q\|L\|\\\$\|.[^\)]*\)\\s\*\(\[0-9\.,\]\+\)\/i\)/g,
    "line.match(/(?:Q|L|\\$|₡|C\\$|C|RD\\$|S\\/)\\s*([0-9.,]+)/i)"
);

content = content.replace(
    /targetPricesText\.match\(\/\(\?:Q\|L\|\\\$\|.[^\)]*\)\\s\*\(\[0-9\.,\]\+\)\/i\)/g,
    "targetPricesText.match(/(?:Q|L|\\$|₡|C\\$|C|RD\\$|S\\/)\\s*([0-9.,]+)/i)"
);

fs.writeFileSync('server/index.js', content);
console.log("Updated currency regexes");
