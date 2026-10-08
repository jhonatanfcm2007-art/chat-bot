const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const regex = /if \(waLine === '3' \|\| waLine === '4'\) \{\s*countryISO = 'HN';\s*\}/;
const replacement = `if (waLine === '3') {
        countryISO = 'HN';
    }`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('server/index.js', code);
    console.log("Reverted waLine 4 back to Ambas/All behavior.");
} else {
    console.log("Could not find the waLine 4 override in server/index.js.");
}
