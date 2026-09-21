import pkg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pkg;
const connectionString = process.env.DATABASE_URL;

let pool;
if (connectionString) {
    pool = new Pool({
        connectionString,
        ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
        max: 20, // Max number of connections
    });
}

export async function initDB(dataDir) {
    if (!pool) {
        console.log('⚠️ DATABASE_URL no definida. Ejecutando en modo archivos locales.');
        return false;
    }

    try {
        console.log('🔄 Verificando esquema de PostgreSQL...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chats (
                id VARCHAR(255) PRIMARY KEY,
                data JSONB NOT NULL
            );
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS json_store (
                key VARCHAR(255) PRIMARY KEY,
                data JSONB NOT NULL
            );
        `);

        // Check if migration is needed
        const { rows } = await pool.query('SELECT COUNT(*) as count FROM chats');
        if (parseInt(rows[0].count) === 0) {
            console.log('🚀 Iniciando migración automática de archivos JSON a PostgreSQL...');
            
            const CHATS_FILE = path.join(dataDir, 'chats.json');
            if (fs.existsSync(CHATS_FILE)) {
                console.log("Migrando chats.json (esto puede tomar un momento)...");
                const chatsData = JSON.parse(fs.readFileSync(CHATS_FILE, 'utf-8'));
                const entries = Object.entries(chatsData);
                
                // Migrar en lotes
                const BATCH_SIZE = 500;
                for (let i = 0; i < entries.length; i += BATCH_SIZE) {
                    const batch = entries.slice(i, i + BATCH_SIZE);
                    await pool.query('BEGIN');
                    for (const [id, data] of batch) {
                        await pool.query(
                            `INSERT INTO chats (id, data) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
                            [id, JSON.stringify(data)]
                        );
                    }
                    await pool.query('COMMIT');
                    console.log(`Migrados ${Math.min(i + BATCH_SIZE, entries.length)} / ${entries.length} chats...`);
                }
            }

            const filesToStore = [
                'inventory', 'sales', 'settings', 'platforms', 
                'providers', 'campaigns', 'customers', 'users', 
                'knowledge_base', 'stores', 'anomalies', 'vapid', 'push_subscriptions'
            ];

            for (const key of filesToStore) {
                const filepath = path.join(dataDir, `${key}.json`);
                if (fs.existsSync(filepath)) {
                    console.log(`Migrando ${key}.json...`);
                    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
                    await pool.query(
                        `INSERT INTO json_store (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data`,
                        [key, JSON.stringify(data)]
                    );
                }
            }
            console.log('✅ Migración a PostgreSQL completada con éxito.');
        } else {
            console.log('✅ Base de datos PostgreSQL verificada. Chats existentes:', rows[0].count);
        }
        return true;
    } catch (e) {
        console.error('❌ Error fatal en PostgreSQL:', e);
        return false;
    }
}

export async function getDbChats() {
    if (!pool) return null;
    const { rows } = await pool.query('SELECT id, data FROM chats');
    const chats = {};
    for (const row of rows) {
        chats[row.id] = row.data;
    }
    return chats;
}

export async function getDbStore(key, defaultValue) {
    if (!pool) return null;
    const { rows } = await pool.query('SELECT data FROM json_store WHERE key = $1', [key]);
    if (rows.length > 0) return rows[0].data;
    return defaultValue;
}

export async function saveDbChat(id, data) {
    if (!pool) return;
    await pool.query(
        'INSERT INTO chats (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data',
        [id, JSON.stringify(data)]
    );
}

export async function deleteDbChat(id) {
    if (!pool) return;
    await pool.query('DELETE FROM chats WHERE id = $1', [id]);
}

export async function saveDbStore(key, data) {
    if (!pool) return;
    await pool.query(
        'INSERT INTO json_store (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data',
        [key, JSON.stringify(data)]
    );
}

export default pool;
