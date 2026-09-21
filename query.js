import dotenv from 'dotenv';
dotenv.config();
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
    const { rows } = await pool.query("SELECT data FROM json_store WHERE key = 'knowledge_base'");
    if (rows.length > 0) {
        console.log(JSON.stringify(rows[0].data.map(p => ({name: p.name, line: p.line, keywords: p.keywords})), null, 2));
    } else {
        console.log("No data");
    }
    process.exit(0);
}
run();
