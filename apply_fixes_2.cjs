const fs = require('fs');

let c = fs.readFileSync('server/index.js', 'utf8');

c = c.replace(/function backupDatabase\(\) \{[\s\S]*?\}\s*setInterval\(backupDatabase, 12 \* 60 \* 60 \* 1000\);/g, `function backupDatabase() {
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
}
setInterval(backupDatabase, 12 * 60 * 60 * 1000);`);

fs.writeFileSync('server/index.js', c);
console.log("Aplicado con exito");
