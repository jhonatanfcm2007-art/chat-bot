const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

// 1. Agregar la Regla 20 a globalRules
const rule18 = /18\. VERIFICACIÓN DE PRECIO.*?antes de pedirle sus datos de envío\./s;
if (rule18.test(c)) {
    c = c.replace(rule18, `$&
  20. SOLICITUD DE FOTOS (¡CRÍTICO!): Si el cliente te pide fotos, imágenes, catálogos visuales, o resultados del producto (ej. 'quiero ver una foto', 'mándame fotos', 'quiero estar segura'), ESTÁ ESTRICTAMENTE PROHIBIDO decirle que se las vas a enviar o prometer fotos. Tu ÚNICA respuesta permitida es escribir exactamente la etiqueta [APAGAR_BOT_SOPORTE] y nada más, para que un asesor humano tome el control y le envíe las imágenes.`);
    console.log("Regla 20 de fotos inyectada en globalRules.");
} else {
    console.log("No se encontro la regla 18.");
}

// 2. Sobrescribir la migración vieja que añadía ENVIAR_FOTO, para que ahora LA ELIMINE
const oldMigration = /if \(settings\[line\]\.systemPrompt && !settings\[line\]\.systemPrompt\.includes\('\[ENVIAR_FOTO\]'\)\) \{[^}]+\}/;
if (oldMigration.test(c)) {
    const newMigration = `if (settings[line].systemPrompt && settings[line].systemPrompt.includes('[ENVIAR_FOTO]')) {
        settings[line].systemPrompt = settings[line].systemPrompt.replace(/- Si el cliente te pide fotos.*?automáticamente\\./gi, '');
        settings[line].systemPrompt = settings[line].systemPrompt.replace(/\\[ENVIAR_FOTO\\]/g, '');
        settingsModified = true;
    }`;
    c = c.replace(oldMigration, newMigration);
    console.log("Migracion vieja sobrescrita.");
} else {
    console.log("No se encontro la migracion vieja.");
}

fs.writeFileSync('server/index.js', c);
