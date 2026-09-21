const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

// 1. Agregar el import de db.js
const importDb = `import { initDB, getDbChats, getDbStore, saveDbChat, deleteDbChat, saveDbStore } from './db.js';\n`;
c = c.replace(/import { normalizarDireccionConGemini } from '\.\/services\/geoNormalizer\.js';/, `import { normalizarDireccionConGemini } from './services/geoNormalizer.js';\n${importDb}`);

const loadDataRegex = /\/\/ --- PERSISTENCIA ---[\s\S]*?(?=\/\/ --- CONFIGURACI.*?N DE NOTIFICACIONES PUSH ---)/s;

const newLoadData = `// --- PERSISTENCIA ---
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const INVENTORY_FILE = path.join(DATA_DIR, 'inventory.json');
const SALES_FILE = path.join(DATA_DIR, 'sales.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const PLATFORMS_FILE = path.join(DATA_DIR, 'platforms.json');
const PROVIDERS_FILE = path.join(DATA_DIR, 'providers.json');
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'campaigns.json');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const KNOWLEDGE_BASE_FILE = path.join(DATA_DIR, 'knowledge_base.json');
const STORES_FILE = path.join(DATA_DIR, 'stores.json');
const ANOMALIES_FILE = path.join(DATA_DIR, 'anomalies.json');

let inventory = [];
let anomalies = [];
let sales = [];
let chats = {};
let settings = {};
let platforms = [];
let providers = [];
let campaigns = [];
let customers = [];
let users = [];
let knowledgeBaseDb = [];
let storesDb = [];

// Inicializar DB (hará la migración si es necesario)
const isPgEnabled = await initDB(DATA_DIR);

function loadJson(file, defaultVal) {
    try {
        if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch(e) { console.error('Error cargando '+file, e); }
    return defaultVal;
}

if (isPgEnabled) {
    console.log("Cargando datos desde PostgreSQL...");
    chats = (await getDbChats()) || {};
    inventory = await getDbStore('inventory', []);
    anomalies = await getDbStore('anomalies', []);
    sales = await getDbStore('sales', []);
    settings = await getDbStore('settings', {});
    platforms = await getDbStore('platforms', []);
    providers = await getDbStore('providers', []);
    campaigns = await getDbStore('campaigns', []);
    customers = await getDbStore('customers', []);
    users = await getDbStore('users', []);
    knowledgeBaseDb = await getDbStore('knowledge_base', []);
    storesDb = await getDbStore('stores', []);
} else {
    console.log("Cargando datos desde JSON locales...");
    inventory = loadJson(INVENTORY_FILE, []);
    anomalies = loadJson(ANOMALIES_FILE, []);
    sales = loadJson(SALES_FILE, []);
    chats = loadJson(CHATS_FILE, {});
    settings = loadJson(SETTINGS_FILE, {});
    platforms = loadJson(PLATFORMS_FILE, []);
    providers = loadJson(PROVIDERS_FILE, []);
    campaigns = loadJson(CAMPAIGNS_FILE, []);
    customers = loadJson(CUSTOMERS_FILE, []);
    users = loadJson(USERS_FILE, []);
    knowledgeBaseDb = loadJson(KNOWLEDGE_BASE_FILE, []);
    storesDb = loadJson(STORES_FILE, []);
}

function atomicSave(filepath, data) {
    try {
        const tempFile = filepath + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify(data));
        fs.renameSync(tempFile, filepath);
    } catch(e) { console.error('Error guardando '+filepath, e); }
}

function saveInventory(data) { if (isPgEnabled) saveDbStore('inventory', data); else atomicSave(INVENTORY_FILE, data); }
function saveAnomalies(data) { if (isPgEnabled) saveDbStore('anomalies', data); else atomicSave(ANOMALIES_FILE, data); }
function saveSales(data) { if (isPgEnabled) saveDbStore('sales', data); else atomicSave(SALES_FILE, data); }
function saveSettings(data) { if (isPgEnabled) saveDbStore('settings', data); else atomicSave(SETTINGS_FILE, data); }
function savePlatforms(data) { if (isPgEnabled) saveDbStore('platforms', data); else atomicSave(PLATFORMS_FILE, data); }
function saveProviders(data) { if (isPgEnabled) saveDbStore('providers', data); else atomicSave(PROVIDERS_FILE, data); }
function saveCampaigns(data) { if (isPgEnabled) saveDbStore('campaigns', data); else atomicSave(CAMPAIGNS_FILE, data); }
function saveCustomers(data) { if (isPgEnabled) saveDbStore('customers', data); else atomicSave(CUSTOMERS_FILE, data); }
function saveUsers(data) { if (isPgEnabled) saveDbStore('users', data); else atomicSave(USERS_FILE, data); }
function saveKnowledgeBase(data) { if (isPgEnabled) saveDbStore('knowledge_base', data); else atomicSave(KNOWLEDGE_BASE_FILE, data); }
function saveStores(data) { if (isPgEnabled) saveDbStore('stores', data); else atomicSave(STORES_FILE, data); }

const chatHashes = {};
let pendingDbSave = false;

function asyncAtomicSave(filepath, data) {
    return new Promise((resolve) => {
        const tempFile = filepath + '.tmp';
        fs.writeFile(tempFile, JSON.stringify(data), 'utf8', (err) => {
            if (err) return resolve();
            fs.rename(tempFile, filepath, () => resolve());
        });
    });
}

function saveChats(data) {
    if (pendingDbSave) return;
    pendingDbSave = true;
    setTimeout(async () => {
        pendingDbSave = false;
        
        if (!isPgEnabled) {
            await asyncAtomicSave(CHATS_FILE, chats);
            return;
        }

        const dirtyChats = [];
        for (const id in chats) {
            const chat = chats[id];
            const hash = \`\${chat.messages?.length || 0}-\${chat.updatedAt || 0}-\${chat.tags?.length || 0}-\${chat.assignedProduct || ''}-\${chat.aiDisabled ? 1 : 0}-\${chat.isBlocked ? 1 : 0}-\${chat.trackingNumber || ''}-\${chat.customerName || ''}\`;
            
            if (chatHashes[id] !== hash) {
                dirtyChats.push({ id, data: chat });
                chatHashes[id] = hash;
            }
        }
        
        if (dirtyChats.length > 0) {
            try {
                await Promise.all(dirtyChats.map(c => saveDbChat(c.id, c.data)));
            } catch (e) {
                console.error('Error guardando chats en Postgres:', e);
            }
        }
    }, 2000);
}

`;

if (loadDataRegex.test(c)) {
    c = c.replace(loadDataRegex, newLoadData);
    
    // Ahora vamos a borrar las funciones que ya inyectamos si existen abajo
    c = c.replace(/function atomicSave[\s\S]*?\}\n/s, "");
    c = c.replace(/async function asyncAtomicSave[\s\S]*?\}\n/s, "");
    c = c.replace(/let pendingSaveTimer = null;\nlet isChatsSaving = false;\nlet saveQueued = false;\n\nfunction saveChats\(data\) \{[\s\S]*?\}\n/s, "");
    
    const saveFuncs = [
        /function saveInventory\(data\) \{[\s\S]*?\}\n/s,
        /function saveAnomalies\(data\) \{[\s\S]*?\}\n/s,
        /function saveSales\(data\) \{[\s\S]*?\}\n/s,
        /function saveSettings\(data\) \{[\s\S]*?\}\n/s,
        /function savePlatforms\(data\) \{[\s\S]*?\}\n/s,
        /function saveProviders\(data\) \{[\s\S]*?\}\n/s,
        /function saveCampaigns\(data\) \{[\s\S]*?\}\n/s,
        /function saveCustomers\(data\) \{[\s\S]*?\}\n/s,
        /function saveUsers\(data\) \{[\s\S]*?\}\n/s,
        /function saveKnowledgeBase\(data\) \{[\s\S]*?\}\n/s,
        /function saveStores\(data\) \{[\s\S]*?\}\n/s
    ];
    
    for (const r of saveFuncs) {
        c = c.replace(r, "");
    }

    fs.writeFileSync('server/index.js', c);
    console.log("Inyección exitosa: Postgres conectado.");
} else {
    console.log("No se encontró el bloque PERSISTENCIA (Regex falló).");
}
