import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function checkSettings() {
    try {
        const res = await pool.query("SELECT data FROM kv_store WHERE key = 'settings'");
        if (res.rows.length > 0) {
            console.log(JSON.stringify(res.rows[0].data, null, 2));
        } else {
            console.log("No settings found in DB.");
        }
    } catch (e) {
        console.error(e);
    }
    pool.end();
}
checkSettings();
