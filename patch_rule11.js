import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const regex = /11\. REPROGRAMACI(?:.+)N POSTERIOR Y D(?:.+)AS H(?:.+)BILES: La transportadora trabaja SOLO de Lunes a S(?:.+)bado\. (?:.+)NO HACEMOS ENTREGAS LOS DOMINGOS! Si un cliente pide entrega para un domingo, dile que no es posible y ofr(?:.+)cele amablemente entregar el s(?:.+)bado o el lunes\. Si pide fecha posterior v(?:.+)lida \("m(?:.+)ndelo el viernes"\), NO DESCARTES EL PEDIDO\. Emite la etiqueta \[CONFIRMACION_RETENIDA\] al final del mensaje y resp(?:.+)ndele literalmente: "Entendido, no se preocupe\. Se lo dejamos programado para entrega el \[D(?:.+)a\/Fecha solicitada\] para que lo reciba con toda tranquilidad (.+)"/g;

const match = content.match(regex);
if (match) {
    console.log("Match found!");
    const replacement = '11. TIEMPOS DE ENVIO Y REPROGRAMACION: Los envios tardan SIEMPRE de 1 a 3 dias habiles. NUNCA PROMETAS ENTREGAS PARA HOY MISMO. Si el cliente pregunta si puede llegar hoy o manana, dile amablemente que tarda de 1 a 3 dias habiles (calcula y mencionable que dia aproximado le llegaria basandote en la fecha actual que te da el sistema). La transportadora trabaja SOLO de Lunes a Sabado. NO HACEMOS ENTREGAS LOS DOMINGOS. Si pide una fecha posterior valida (ej. "mandelo el viernes de la proxima semana"), NO DESCARTES EL PEDIDO. Emite la etiqueta [CONFIRMACION_RETENIDA] al final del mensaje y respondele literalmente: "Entendido, no se preocupe. Se lo dejamos programado para entrega el [Dia/Fecha solicitada] para que lo reciba con toda tranquilidad ' + match[0].slice(-2) + '"';
    content = content.replace(regex, replacement);
    fs.writeFileSync('server/index.js', content);
    console.log("Patched successfully");
} else {
    console.log("Match not found");
}
