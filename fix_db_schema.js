import fs from 'fs';
let content = fs.readFileSync('server/db.js', 'utf8');

const replacement = `
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
    content = content.replace(
        /CREATE TABLE IF NOT EXISTS json_store \([\s\S]*?\);\n\s*`\);/,
        "CREATE TABLE IF NOT EXISTS json_store (\n                key VARCHAR(255) PRIMARY KEY,\n                data JSONB NOT NULL\n            );\n        `);" + replacement
    );
}

fs.writeFileSync('server/db.js', content);
console.log("DB schema fixed");
