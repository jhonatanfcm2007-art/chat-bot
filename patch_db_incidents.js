import fs from 'fs';
let content = fs.readFileSync('server/db.js', 'utf8');

// 1. Create incidents table
const createJsonStoreTarget = `        await pool.query(\`
            CREATE TABLE IF NOT EXISTS json_store (
                key VARCHAR(255) PRIMARY KEY,
                data JSONB NOT NULL
            );
        \`);`;

const newTable = `        await pool.query(\`
            CREATE TABLE IF NOT EXISTS incidents (
                id VARCHAR(255) PRIMARY KEY,
                data JSONB NOT NULL
            );
        \`);`;

if (!content.includes('CREATE TABLE IF NOT EXISTS incidents')) {
    content = content.replace(createJsonStoreTarget, createJsonStoreTarget + '\n\n' + newTable);
}

// 2. Add CRUD for incidents
const getDbChatsTarget = `export async function getDbChats() {`;

const newMethods = `export async function getDbIncidents() {
    if (!pool) return null;
    const { rows } = await pool.query('SELECT id, data FROM incidents');
    const incidents = [];
    for (const row of rows) {
        incidents.push(row.data);
    }
    return incidents;
}

export async function saveDbIncident(id, data) {
    if (!pool) return;
    await pool.query(
        'INSERT INTO incidents (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data',
        [id, JSON.stringify(data)]
    );
}

`;

if (!content.includes('export async function getDbIncidents')) {
    content = content.replace(getDbChatsTarget, newMethods + getDbChatsTarget);
}

fs.writeFileSync('server/db.js', content);
console.log("Patched server/db.js");
