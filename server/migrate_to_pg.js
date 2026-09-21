import fs from 'fs';
import path from 'path';
import pkg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const DATA_DIR = path.join(__dirname, 'data');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ ERROR: No se encontró DATABASE_URL en las variables de entorno.");
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function migrate() {
    console.log("Iniciando migración a PostgreSQL...");
    
    // 1. Crear tabla de chats
    await pool.query(`
        CREATE TABLE IF NOT EXISTS chats (
            id VARCHAR(255) PRIMARY KEY,
            data JSONB NOT NULL
        );
    `);
    
    // 2. Crear tabla genérica para otras configuraciones
    await pool.query(`
        CREATE TABLE IF NOT EXISTS json_store (
            key VARCHAR(255) PRIMARY KEY,
            data JSONB NOT NULL
        );
    `);

    console.log("✅ Tablas creadas/verificadas.");

    // 3. Migrar chats
    if (fs.existsSync(CHATS_FILE)) {
        console.log("Leyendo chats.json...");
        const chats = JSON.parse(fs.readFileSync(CHATS_FILE, 'utf-8'));
        const entries = Object.entries(chats);
        console.log(`Encontrados ${entries.length} chats para migrar.`);
        
        let count = 0;
        for (const [id, data] of entries) {
            await pool.query(
                `INSERT INTO chats (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
                [id, JSON.stringify(data)]
            );
            count++;
            if (count % 1000 === 0) console.log(`Migrados ${count} chats...`);
        }
        console.log("✅ Migración de chats completada.");
    } else {
        console.log("⚠️ No se encontró chats.json, saltando migración de chats.");
    }

    // 4. Migrar otros archivos
    const filesToStore = [
        'inventory.json', 'sales.json', 'settings.json', 'platforms.json', 
        'providers.json', 'campaigns.json', 'customers.json', 'users.json', 
        'knowledge_base.json', 'stores.json', 'anomalies.json', 'vapid.json', 'push_subscriptions.json'
    ];

    for (const filename of filesToStore) {
        const filepath = path.join(DATA_DIR, filename);
        const key = filename.replace('.json', '');
        if (fs.existsSync(filepath)) {
            console.log(`Migrando ${filename}...`);
            const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
            await pool.query(
                `INSERT INTO json_store (key, data) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data`,
                [key, JSON.stringify(data)]
            );
        }
    }

    console.log("🎉 MIGRACIÓN COMPLETA.");
    process.exit(0);
}

migrate().catch(e => {
    console.error("Error durante la migración:", e);
    process.exit(1);
});
