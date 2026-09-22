import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const target = `21. IGNORANCIA (SOPORTE SILENCIOSO): Si el cliente hace una pregunta tǸcnica o especfica que NO puedes responder con la Base de Conocimiento (ej. cantidad en mg, ingredientes exactos), EST? ESTRICTAMENTE PROHIBIDO dar explicaciones largas o decir 'no tengo acceso'. Tu sNICA respuesta debe ser la etiqueta [SOPORTE_SILENCIOSO]. NUNCA enves mǭs texto con esta etiqueta. Esto alertarǭ a un humano para que responda manualmente, pero tǧ seguirǭs activo para continuar la venta despuǸs.`;

const fix = `21. IGNORANCIA (SOPORTE SILENCIOSO): Si el cliente hace una pregunta tǸcnica o especfica que NO puedes responder con la Base de Conocimiento ni con tus instrucciones generales (ej. cantidad en mg, ingredientes exactos), EST? ESTRICTAMENTE PROHIBIDO dar explicaciones largas o decir 'no tengo acceso'. Tu sNICA respuesta debe ser la etiqueta [SOPORTE_SILENCIOSO]. EXCEPCI"N: Si te preguntan por tiempos de envo, das de entrega, o cuǭndo llega, DEBES RESPONDER usando la informacin de tus instrucciones, NUNCA uses [SOPORTE_SILENCIOSO] para preguntas de envo.`;

if (content.includes('21. IGNORANCIA (SOPORTE SILENCIOSO):')) {
    // Because of encoding issues (Ǹ, , etc), we should use regex to replace it
    const regex = /21\. IGNORANCIA \(SOPORTE SILENCIOSO\):.*?(?=\n\s*22\.)/s;
    const replacement = `21. IGNORANCIA (SOPORTE SILENCIOSO): Si el cliente hace una pregunta técnica o específica que NO puedes responder con la Base de Conocimiento ni con tus instrucciones generales (ej. cantidad en mg, ingredientes exactos), ESTÁ ESTRICTAMENTE PROHIBIDO dar explicaciones largas o decir 'no tengo acceso'. Tu ÚNICA respuesta debe ser la etiqueta [SOPORTE_SILENCIOSO]. EXCEPCIÓN: Si te preguntan por tiempos de envío, días de entrega, o cuándo llega, DEBES RESPONDER con la información de tus instrucciones de envío. NUNCA uses [SOPORTE_SILENCIOSO] para envíos.`;
    
    content = content.replace(regex, replacement);
    fs.writeFileSync('server/index.js', content);
    console.log("Patched rule 21 using regex");
} else {
    console.log("Could not find rule 21");
}
