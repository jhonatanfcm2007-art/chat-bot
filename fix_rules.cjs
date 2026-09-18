const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

c = c.replace(/En \[PRODUCTOS\] usa .*? cantidad\./g,
  `En [PRODUCTOS] usa ÚNICAMENTE EL NOMBRE EXACTO DEL PRODUCTO de la base de conocimiento (ej. "Neuropathy") y la cantidad. JAMÁS inventes nombres genéricos como "crema" o "combo de 2 cremas" si no se llaman así en tu catálogo. ¡Esto es CRÍTICO para que el sistema reconozca el pedido!`);

fs.writeFileSync('server/index.js', c);
