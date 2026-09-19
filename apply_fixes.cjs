const fs = require('fs');

let c = fs.readFileSync('server/index.js', 'utf8');

// 1. Reemplazar saveChats
const newSaveChats = `
let pendingSaveTimer = null;
let isSaving = false;
let saveQueued = false;

async function asyncAtomicSave(filePath, data) {
    const tempFile = \`\${filePath}.tmp.\${Date.now()}\`;
    try {
        // Ejecutamos en el background (aunque stringify es sincrono, fs promises no bloquea el I/O)
        const json = JSON.stringify(data, null, 2); 
        await fs.promises.writeFile(tempFile, json, 'utf8');
        await fs.promises.rename(tempFile, filePath);
    } catch (err) {
        console.error(\`[SAVE] Error asincrono en \${filePath}:\`, err);
        try { await fs.promises.unlink(tempFile); } catch (e) {}
    }
}

function saveChats(data) {
    if (pendingSaveTimer) return; // Ya hay un guardado programado
    pendingSaveTimer = setTimeout(async () => {
        pendingSaveTimer = null;
        if (isSaving) {
            saveQueued = true; // Si esta guardando, encolar para el siguiente ciclo
            return;
        }
        isSaving = true;
        await asyncAtomicSave(CHATS_FILE, chats);
        isSaving = false;
        if (saveQueued) {
            saveQueued = false;
            saveChats(chats);
        }
    }, 5000); // Guardar cada 5 segundos maximo
}
`;
c = c.replace(/function saveChats\(data\) \{ atomicSave\(CHATS_FILE, data\); \}/g, newSaveChats);

// 2. Mejorar backupDatabase
const oldBackup = `function backupDatabase() {
    try {
        if (!fs.existsSync(CHATS_FILE)) return;
        const dateStr = new Date().toISOString().split('T')[0];
        const backupFile = path.join(BACKUP_DIR, \`chats_backup_\${dateStr}.json\`);
        // Solo hacer backup si no existe el de hoy
        if (!fs.existsSync(backupFile)) {
            fs.copyFileSync(CHATS_FILE, backupFile);
            console.log(\`✅ [BACKUP] Copia de seguridad creada: chats_backup_\${dateStr}.json\`);
        }
    } catch (e) {
        console.error('❌ [BACKUP] Error creando copia de seguridad:', e);
    }
}`;

const newBackup = `function backupDatabase() {
    try {
        if (!fs.existsSync(CHATS_FILE)) return;
        const dateStr = new Date().toISOString().split('T')[0];
        const backupFile = path.join(BACKUP_DIR, \`chats_backup_\${dateStr}.json\`);
        
        if (!fs.existsSync(backupFile)) {
            fs.copyFileSync(CHATS_FILE, backupFile);
            console.log(\`✅ [BACKUP] Copia de seguridad creada: chats_backup_\${dateStr}.json\`);
        }

        // LIMPIEZA DE BACKUPS (Mantener solo los ultimos 3 dias)
        const files = fs.readdirSync(BACKUP_DIR);
        const backupFiles = files.filter(f => f.startsWith('chats_backup_') && f.endsWith('.json')).sort();
        if (backupFiles.length > 3) {
            const filesToDelete = backupFiles.slice(0, backupFiles.length - 3);
            for (const file of filesToDelete) {
                fs.unlinkSync(path.join(BACKUP_DIR, file));
                console.log(\`🗑️ [BACKUP] Backup antiguo eliminado: \${file}\`);
            }
        }
    } catch (e) {
        console.error('❌ [BACKUP] Error en backups:', e);
    }
}`;

c = c.replace(oldBackup, newBackup);

fs.writeFileSync('server/index.js', c);
console.log("Aplicado con exito");
