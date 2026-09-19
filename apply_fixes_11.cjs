const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

c = c.replace(
    /14\. MONEDA Y PA[^]+?desde all[^.]*\./i,
    "14. CERO CONVERSIONES DE MONEDA (¡CRÍTICO!): ¡NUNCA hagas cálculos ni conversiones de divisas! Si un cliente pide precios en dólares u otra moneda distinta a la que aparece en el catálogo, o si el catálogo de ese producto solo tiene precios en otra moneda (ej. Lempiras, Quetzales) y el cliente es de El Salvador o indica estar en un país con moneda distinta, ESTÁ ESTRICTAMENTE PROHIBIDO inventar un precio equivalente o hacer conversiones matemáticas (ej. NUNCA digas \"equivale aproximadamente a $\"). En estos casos, tu ÚNICA RESPUESTA debe ser la etiqueta [APAGAR_BOT_SOPORTE] para que un humano lo asista. ¡Cero excepciones!"
);

fs.writeFileSync('server/index.js', c);
