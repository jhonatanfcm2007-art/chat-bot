const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const regex = /explicaciones\.\`;/;
const replacement = `explicaciones.\`;

        let feriadoRules = "";
        if (countryContext === 'Honduras') {
            feriadoRules = \`\\n  28. FERIADO MORAZÁNICO (¡REGLA TEMPORAL CRÍTICA!): Del miércoles al sábado de esta semana es Feriado Morazánico en Honduras, por lo que las transportadoras no laboran. Es OBLIGATORIO que le informes esto al cliente ANTES de confirmar el pedido y emitir [ENTREGAR_AHORA]. Dile textualmente de forma amable: "Por motivo del Feriado Morazánico, los envíos se están programando para ser entregados aproximadamente el lunes 12 de octubre. ¿Estás de acuerdo con recibir tu paquete en esa fecha?". SOLO SI EL CLIENTE ACEPTA o confirma que no hay problema, puedes proceder a cerrar la venta emitiendo la etiqueta [ENTREGAR_AHORA]. Si el cliente NO acepta o tiene objeciones sobre la fecha, no emitas la etiqueta.\`;
        }`;

if (code.includes('explicaciones.`;')) {
    code = code.replace(regex, replacement);
    
    // Now replace the injection
    const injRegex = /\{ role: "system", content: \`\$\{settings\[waLine\]\?\.systemPrompt \|\| settings\["1"\]\.systemPrompt\}\\n\\n\$\{knowledgeContext\}\$\{globalRules\}\` \},/;
    const injReplacement = `{ role: "system", content: \`\${settings[waLine]?.systemPrompt || settings["1"].systemPrompt}\\n\\n\${knowledgeContext}\${globalRules}\${feriadoRules}\` },`;
    
    if (injRegex.test(code)) {
        code = code.replace(injRegex, injReplacement);
        
        // Let's also do it for the tokens approx calculation
        const injRegex2 = /console\.log\("Tokens approx:", \(settings\[waLine\]\?\.systemPrompt \|\| settings\["1"\]\.systemPrompt\)\.length \+ knowledgeContext\.length \+ globalRules\.length\);/;
        const injReplacement2 = `console.log("Tokens approx:", (settings[waLine]?.systemPrompt || settings["1"].systemPrompt).length + knowledgeContext.length + globalRules.length + feriadoRules.length);`;
        code = code.replace(injRegex2, injReplacement2);
        
        fs.writeFileSync('server/index.js', code);
        console.log("Patched successfully!");
    } else {
        console.log("Could not find injection regex!");
    }
} else {
    console.log("Could not find explicaciones.`;");
}
