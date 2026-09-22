import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function checkKB() {
    try {
        const res = await pool.query("SELECT data FROM kv_store WHERE key = 'knowledge_base'");
        if (res.rows.length > 0) {
            const kb = res.rows[0].data;
            const names = kb.map(p => ({
                id: p.id,
                name: p.name,
                shopifyProductId: p.shopifyProductId,
                priceVariations: p.priceVariations?.map(v => ({prefix: v.prefix, dropiId: v.dropiId, shopifyProductId: v.shopifyProductId, storeId: v.storeId}))
            }));
            console.log(JSON.stringify(names, null, 2));
        } else {
            console.log("No KB found in DB.");
        }
    } catch (e) {
        console.error(e);
    }
    pool.end();
}
checkKB();
