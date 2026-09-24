import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// Find the stray code block that starts with "const data = await fetchRes.json();" and ends with "});" at the end.
const startIdx = content.indexOf('        const data = await fetchRes.json();');
if (startIdx !== -1) {
    const endStr = '    }\n});';
    let endIdx = content.indexOf(endStr, startIdx);
    if (endIdx !== -1) {
        content = content.substring(0, startIdx) + content.substring(endIdx + endStr.length);
        fs.writeFileSync('server/index.js', content);
        console.log("Fixed server/index.js stray code");
    } else {
        console.log("Could not find end of stray code");
    }
} else {
    console.log("Could not find stray code start");
}
