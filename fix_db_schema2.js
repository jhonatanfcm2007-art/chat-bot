import fs from 'fs';
let content = fs.readFileSync('server/db.js', 'utf8');

const anchor = `CREATE TABLE IF NOT EXISTS json_store`;

const injection = `
        await pool.query(\`
            CREATE TABLE IF NOT EXISTS incidents (
                id VARCHAR(255) PRIMARY KEY,
                data JSONB NOT NULL
            );
        \`);
        await pool.query(\`
            CREATE TABLE IF NOT EXISTS webhook_events (
                id VARCHAR(255) PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        \`);
`;

if (!content.includes('CREATE TABLE IF NOT EXISTS incidents')) {
    const parts = content.split('// Check if migration is needed');
    if (parts.length === 2) {
        content = parts[0] + injection + '\n        // Check if migration is needed' + parts[1];
        fs.writeFileSync('server/db.js', content);
        console.log("DB schema fixed with split");
    }
}
