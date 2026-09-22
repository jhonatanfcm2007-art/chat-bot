import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function checkStores() {
    try {
        const res = await pool.query("SELECT data FROM kv_store WHERE key = 'stores'");
        if (res.rows.length > 0) {
            const stores = res.rows[0].data;
            const output = stores.map(s => ({
                id: s.id,
                name: s.name,
                hasShopifyUrl: !!s.shopifyStoreUrl,
                hasShopifyToken: !!s.shopifyAccessToken
            }));
            console.log(JSON.stringify(output, null, 2));
        } else {
            console.log("No stores found in DB.");
        }
    } catch (e) {
        console.error(e);
    }
    pool.end();
}
checkStores();
