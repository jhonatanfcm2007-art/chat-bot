const fs = require('fs');

let c = fs.readFileSync('server/index.js', 'utf8');

c = c.replace(/let pendingSaveTimer = null;\r?\nlet isSaving = false;\r?\nlet saveQueued = false;/g, `let pendingSaveTimer = null;
let isChatsSaving = false;
let saveQueued = false;`);

c = c.replace(/if \(isSaving\) \{/g, `if (isChatsSaving) {`);
c = c.replace(/isSaving = true;/g, `isChatsSaving = true;`);
c = c.replace(/isSaving = false;/g, `isChatsSaving = false;`);

fs.writeFileSync('server/index.js', c);
