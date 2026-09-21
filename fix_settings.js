import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

content = content.replace(
    /if \(!settings\["1"\]\.systemPrompt \|\| !settings\["1"\]\.systemPrompt\.includes\('APAGAR_BOT_SOPORTE'\)\) \{/g,
    "if (!settings['1']) settings['1'] = { systemPrompt: '' };\n    if (!settings['1'].systemPrompt || !settings['1'].systemPrompt.includes('APAGAR_BOT_SOPORTE')) {"
);

fs.writeFileSync('server/index.js', content);
console.log("Crash settings fixed");
