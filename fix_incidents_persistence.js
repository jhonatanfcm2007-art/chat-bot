import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// 1. Add DB imports if not present
if (!content.includes('getDbIncidents')) {
    content = content.replace(
        /import \{ initDB, getDbChats, getDbStore, saveDbChat, deleteDbChat, saveDbStore \} from '\.\/db\.js';/,
        "import { initDB, getDbChats, getDbStore, saveDbChat, deleteDbChat, saveDbStore, getDbIncidents, saveDbIncident } from './db.js';"
    );
}

// 2. Define saveIncidents function (and fix if missing)
const saveIncidentsDef = `
async function saveIncidents(data) {
    if (isPgEnabled) {
        // Guardar cada incidencia individualmente en PostgreSQL para no perder cambios (Fase 1 feedback)
        for (const inc of data) {
            await saveDbIncident(inc.id, inc);
        }
    } else {
        await asyncAtomicSave(INCIDENTS_FILE, data);
    }
}
`;

if (!content.includes('async function saveIncidents')) {
    content = content.replace(
        /function saveUsers\(data\) \{/,
        saveIncidentsDef + '\nfunction saveUsers(data) {'
    );
    // fallback if function saveUsers has async
    content = content.replace(
        /async function saveUsers\(data\) \{/,
        saveIncidentsDef + '\nasync function saveUsers(data) {'
    );
} else {
    // If it somehow exists, overwrite it
    content = content.replace(/async function saveIncidents\(data\) \{[^}]+\}/, saveIncidentsDef.trim());
}

// 3. Load from getDbIncidents instead of getDbStore
content = content.replace(
    /incidents = await getDbStore\('incidents', \[\]\);/g,
    "incidents = await getDbIncidents();"
);

fs.writeFileSync('server/index.js', content);
console.log("Fixed saveIncidents and PG persistence");
