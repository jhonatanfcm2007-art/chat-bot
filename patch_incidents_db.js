import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// 1. Add INCIDENTS_FILE
content = content.replace(
    /const USERS_FILE = path\.join\(DATA_DIR, 'users\.json'\);/,
    "const USERS_FILE = path.join(DATA_DIR, 'users.json');\nconst INCIDENTS_FILE = path.join(DATA_DIR, 'incidents.json');"
);

// 2. Add let incidents = [];
content = content.replace(
    /let users = \[\];/,
    "let users = [];\nlet incidents = [];"
);

// 3. Add saveIncidents function
content = content.replace(
    /async function saveUsers\(data\) \{/,
    "async function saveIncidents(data) {\n    if (isPgEnabled) await saveDbStore('incidents', data);\n    else await asyncAtomicSave(INCIDENTS_FILE, data);\n}\n\nasync function saveUsers(data) {"
);

// 4. Add DB loading in loadData() -> newInit
content = content.replace(
    /users = await getDbStore\('users', \[\]\);/,
    "users = await getDbStore('users', []);\n    incidents = await getDbStore('incidents', []);"
);
content = content.replace(
    /if \(fs\.existsSync\(USERS_FILE\)\) users = JSON\.parse\(fs\.readFileSync\(USERS_FILE, 'utf-8'\)\);/,
    "if (fs.existsSync(USERS_FILE)) users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));\n        if (fs.existsSync(INCIDENTS_FILE)) incidents = JSON.parse(fs.readFileSync(INCIDENTS_FILE, 'utf-8'));"
);

fs.writeFileSync('server/index.js', content);
console.log("Database initialized");
