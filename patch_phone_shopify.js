import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

// 1. Fix Phone Number Hallucination in AI Prompt
const promptTarget = `        let systemPrompt = \`Eres el asistente de ventas de "Dropi"`;
const promptFix = `        let cleanPhonePrompt = fromPhone ? fromPhone.replace('@c.us', '') : '';
        let systemPrompt = \`Eres el asistente de ventas de "Dropi".
        
REGLA ESTRICTA DE TELÉFONO:
El teléfono real del cliente con el que hablas es EXACTAMENTE: \${cleanPhonePrompt}
CUANDO CONFIRMES EL PEDIDO AL FINAL, DEBES USAR ESTE NÚMERO EXACTO Y COMPLETO (\${cleanPhonePrompt}). NO LE AGREGUES NI LE QUITES NINGÚN DÍGITO (como '4' al final). NO INVENTES NÚMEROS.
\`;\n        systemPrompt += \``;

content = content.replace(promptTarget, promptFix);


// 2. Fix Shopify product mismatch (Don't let AI override the name if we already have the ID!)
// In createShopifyOrder, log why it fails to connect to Shopify to be absolutely sure.
const shopifyTarget = `      if (!SHOPIFY_URL || !SHOPIFY_TOKEN) {
          console.log(\`?O [Shopify Skip] El producto "\$\{chat.assignedProduct || products\}" no tiene tienda configurada en la Base de Conocimiento. Omitiendo carga.\`);
          return { success: false, error: 'Credenciales Shopify no configuradas o producto sin tienda asignada.' };
      }`;
      
const shopifyFix = `      if (!SHOPIFY_URL || !SHOPIFY_TOKEN) {
          console.error(\`?O [Shopify Skip] ERROR CRÍTICO: No se encontró URL o TOKEN de tienda para el producto. ID Asignado: \$\{chat.assignedProductId || 'NINGUNO'\}, Nombre buscado: \$\{searchName\}, Producto KB Encontrado: \$\{prod ? prod.name : 'NO'\}\`);
          return { success: false, error: 'Credenciales Shopify no configuradas o producto sin tienda asignada.' };
      }
      if (!PRODUCT_ID) {
          console.error(\`?O [Shopify Skip] ERROR CRÍTICO: No se encontró el ID (Variant ID) en la configuración de la tienda ni en el producto para Shopify. ID Asignado: \$\{chat.assignedProductId\}\`);
          return { success: false, error: 'ID de variante de Shopify (shopifyProductId) no configurado en la Base de Conocimiento.' };
      }`;

content = content.replace(shopifyTarget, shopifyFix);

// Also make sure Shopify GraphQL uses ProductVariant properly.
// The code already does: variantId: \`gid://shopify/ProductVariant/\${PRODUCT_ID}\`

fs.writeFileSync('server/index.js', content);
console.log("Fixed phone and Shopify bugs");
