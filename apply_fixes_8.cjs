const fs = require('fs');
let c = fs.readFileSync('server/index.js', 'utf8');

c = c.replace(
    /chat\.assignedProduct = productList; \/\/ <--- FIX: Ensure product is always available for webhooks/g,
    'if (!chat.assignedProduct) chat.assignedProduct = productList;'
);

c = c.replace(
    /chat\.assignedProduct = productList; \/\/ <--- FIX: Ensure product is available for webhook/g,
    'if (!chat.assignedProduct) chat.assignedProduct = productList;'
);

fs.writeFileSync('server/index.js', c);
