import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

content = content.replace(
    /if \(\!settings\['1'\]\) settings\['1'\] = \{ systemPrompt: '' \};\r?\n\s*if \(\!settings\['1'\]\.systemPrompt \|\| \!settings\['1'\]\.systemPrompt\.includes\('APAGAR_BOT_SOPORTE'\)\) \{\r?\n\s*settings\["1"\]\.systemPrompt = basePrompt;\r?\n\s*settings\["2"\]\.systemPrompt = basePrompt;/g,
    `if (!settings['1']) settings['1'] = { systemPrompt: '' };
    if (!settings['2']) settings['2'] = { systemPrompt: '' };
    if (!settings['1'].systemPrompt || !settings['1'].systemPrompt.includes('APAGAR_BOT_SOPORTE')) {
        settings["1"].systemPrompt = basePrompt;
        settings["2"].systemPrompt = basePrompt;`
);

fs.writeFileSync('server/index.js', content);
