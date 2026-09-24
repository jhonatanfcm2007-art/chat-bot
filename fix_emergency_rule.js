import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const targetStr = `RECORDATORIO DE EMERGENCIA Y REGLA ABSOLUTA: 1) Si el cliente pide precios en una moneda que NO EXISTE en tu catálogo. 2) Si el cliente pide ver fotos, imagenes, como es el producto, o dice que quiere verla. EN CUALQUIERA DE ESTOS DOS CASOS, ESTA ESTRICTAMENTE PROHIBIDO DAR EXPLICACIONES O DISCULPARTE. TU UNICA SALIDA PERMITIDA es escribir exactamente la etiqueta [APAGAR_BOT_SOPORTE] y nada mas, para que un humano asuma el control.`;

const replacementStr = `RECORDATORIO DE EMERGENCIA Y REGLA ABSOLUTA: 1) Si el cliente pide EXPLÍCITAMENTE precios o pagos en una moneda EXTRANJERA que no está en tu catálogo (ej. pide pagar en dólares pero solo tienes quetzales). 2) Si el cliente pide ver fotos, imagenes o videos reales del producto. EN CUALQUIERA DE ESTOS DOS CASOS, ESTÁ ESTRICTAMENTE PROHIBIDO DAR EXPLICACIONES O DISCULPARTE. TU ÚNICA SALIDA PERMITIDA es escribir exactamente la etiqueta [APAGAR_BOT_SOPORTE] y nada más, para que un humano asuma el control. NUNCA te apagues si solo te piden un combo o información normal.`;

// Note: Because of encoding issues with á, é, í, ó, ú, I will use regex replacement
content = content.replace(
    /RECORDATORIO DE EMERGENCIA Y REGLA ABSOLUTA: 1\) Si el cliente pide precios en una moneda que NO EXISTE en tu cat.*?logo\. 2\) Si el cliente pide ver fotos, imagenes, como es el producto, o dice que quiere verla\. EN CUALQUIERA DE ESTOS DOS CASOS, ESTA ESTRICTAMENTE PROHIBIDO DAR EXPLICACIONES O DISCULPARTE\. TU UNICA SALIDA PERMITIDA es escribir exactamente la etiqueta \[APAGAR_BOT_SOPORTE\] y nada mas, para que un humano asuma el control\./g,
    replacementStr
);

fs.writeFileSync('server/index.js', content);
console.log("Emergency rule updated.");
