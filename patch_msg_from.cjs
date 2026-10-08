const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const target1 = "const originalFrom = msg.from;";
const replacement1 = "const originalFrom = msg.from || (body.entry[0].changes[0].value.contacts && body.entry[0].changes[0].value.contacts[0].wa_id);";

if (code.includes(target1)) {
    code = code.replace(target1, replacement1);
    fs.writeFileSync('server/index.js', code);
    console.log('Patched originalFrom fallback in server/index.js');
} else {
    console.log('Target not found!');
}
