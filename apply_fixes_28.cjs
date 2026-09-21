const fs = require('fs');

function removeFunction(code, funcName) {
    const startStr = `function ${funcName}(`;
    const asyncStartStr = `async function ${funcName}(`;
    let startIndex = code.indexOf(startStr);
    if (startIndex === -1) {
        startIndex = code.indexOf(asyncStartStr);
    }
    if (startIndex === -1) return code;
    
    let braceCount = 0;
    let foundFirstBrace = false;
    let endIndex = -1;
    
    for (let i = startIndex; i < code.length; i++) {
        if (code[i] === '{') {
            braceCount++;
            foundFirstBrace = true;
        } else if (code[i] === '}') {
            braceCount--;
            if (foundFirstBrace && braceCount === 0) {
                endIndex = i;
                break;
            }
        }
    }
    
    if (endIndex !== -1) {
        // Find preceding "let isChatsSaving = false;" etc if deleting saveChats
        let cutStart = startIndex;
        return code.substring(0, cutStart) + code.substring(endIndex + 1);
    }
    return code;
}

let c = fs.readFileSync('server/index.js', 'utf8');

// Import DB
const importDb = `import { initDB, getDbChats, getDbStore, saveDbChat, deleteDbChat, saveDbStore } from './db.js';\n`;
c = c.replace(/import { normalizarDireccionConGemini } from '\.\/services\/geoNormalizer\.js';/, `import { normalizarDireccionConGemini } from './services/geoNormalizer.js';\n${importDb}`);

// Eliminar las variables viejas (pendingSaveTimer, isChatsSaving, saveQueued)
c = c.replace(/let pendingSaveTimer = null;\nlet isChatsSaving = false;\nlet saveQueued = false;\n/, '');

// Borrar funciones conflictivas de forma segura usando bracket matching
const funcsToRemove = [
    'atomicSave', 'asyncAtomicSave', 'saveChats',
    'saveInventory', 'saveAnomalies', 'saveSales', 'saveSettings',
    'savePlatforms', 'saveProviders', 'saveCampaigns', 'saveCustomers',
    'saveUsers', 'saveKnowledgeBase', 'saveStores'
];

for (const fn of funcsToRemove) {
    c = removeFunction(c, fn);
}

// Inyectar la inicialización y el override de carga
const newInit = `
// --- NUEVA PERSISTENCIA CON POSTGRES ---
const isPgEnabled = await initDB(DATA_DIR);

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

function asyncAtomicSave(filepath, data) {
    return new Promise((resolve) => {
        const tempFile = filepath + '.tmp';
        fs.writeFile(tempFile, JSON.stringify(data), 'utf8', (err) => {
            if (err) return resolve();
            fs.rename(tempFile, filepath, () => resolve());
        });
    });
}

const chatHashes = {};
let pendingDbSave = false;

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

// Insert after the declaration of the variables
c = c.replace(/let knowledgeBaseDb = \[\];\nlet storesDb = \[\];/, `let knowledgeBaseDb = [];\nlet storesDb = [];\n${newInit}`);

fs.writeFileSync('server/index.js', c);
console.log("Inyección exitosa con Parseo de AST/Brackets.");
