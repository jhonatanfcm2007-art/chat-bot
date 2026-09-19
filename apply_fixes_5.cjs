const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

c = c.replace(/let pendingSaveTimer = null;\r?\n\r?\nlet saveQueued = false;/g, `let pendingSaveTimer = null;\nlet isChatsSaving = false;\nlet saveQueued = false;`);

fs.writeFileSync('server/index.js', c);
