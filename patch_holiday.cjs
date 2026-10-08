const fs = require('fs');
let code = fs.readFileSync('server/index.js', 'utf8');

const regex = /27\. INSISTENCIA EN EL PRECIO[^\`]*\`/g;

let match = code.match(regex);
if (match) {
    const originalText = match[0].slice(0, -1); // remove the backtick
    const newText = originalText + `
  28. FERIADO MORAZÁNICO (REGLA TEMPORAL PARA HONDURAS): Del miércoles al sábado de esta semana es Feriado Morazánico en Honduras, por lo que las transportadoras no laboran. Si el cliente es de Honduras, OBLIGATORIAMENTE debes informarle esto ANTES de emitir la etiqueta final [ENTREGAR_AHORA]. Dile textualmente: "Por motivo del Feriado Morazánico, los envíos se están despachando para ser entregados aproximadamente el lunes 12 de octubre. ¿Estás de acuerdo con recibir tu pedido en esa fecha?". SOLO SI EL CLIENTE ACEPTA o indica que no hay problema, puedes emitir [ENTREGAR_AHORA].\`
`;
    
    // We want this ONLY if country is Honduras, BUT it's easier to dynamically append it during execution based on `countryContext`.
    
    console.log("Found match. Instead of static appending, let's inject a dynamic check!");
}

// Actually, injecting dynamically is safer.
// Let's replace the `const globalRules = ` line and append it there dynamically.

const dynamicRegex = /const globalRules = \`[\\s\\S]*?27\. INSISTENCIA EN EL PRECIO[^`]*\`;/g;
let dynamicMatch = code.match(dynamicRegex);

if (dynamicMatch) {
    const originalDecl = dynamicMatch[0];
    const replacement = originalDecl + `
        
        let feriadoRules = "";
        if (countryContext === 'Honduras') {
            feriadoRules = \`\\n  28. FERIADO MORAZÁNICO (¡REGLA TEMPORAL CRÍTICA!): Del miércoles al sábado de esta semana es Feriado Morazánico en Honduras, por lo que las transportadoras no laboran. Es OBLIGATORIO que le informes esto al cliente ANTES de confirmar el pedido y emitir [ENTREGAR_AHORA]. Dile textualmente de forma amable: "Por motivo del Feriado Morazánico, los envíos se están programando para ser entregados aproximadamente el lunes 12 de octubre. ¿Estás de acuerdo con recibir tu paquete en esa fecha?". SOLO SI EL CLIENTE ACEPTA o confirma que no hay problema, puedes proceder a cerrar la venta emitiendo la etiqueta [ENTREGAR_AHORA]. Si el cliente NO acepta, no cierres la venta.\`;
        }
`;
    // We also need to add ${feriadoRules} to the system prompt injection!
    
    // So let's replace the injection:
    const injectionRegex = /\{ role: "system", content: \`\$\{settings\[waLine\]\?\.systemPrompt \|\| settings\["1"\]\.systemPrompt\}\\n\\n\$\{knowledgeContext\}\$\{globalRules\}\` \},/g;
    const injectionReplacement = `{ role: "system", content: \`\${settings[waLine]?.systemPrompt || settings["1"].systemPrompt}\\n\\n\${knowledgeContext}\${globalRules}\${feriadoRules}\` },`;
    
    code = code.replace(dynamicRegex, replacement);
    code = code.replace(injectionRegex, injectionReplacement);
    
    fs.writeFileSync('server/index.js', code);
    console.log("Patched dynamically!");
} else {
    console.log("Did not find dynamicRegex!");
}
