import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const target = `        let targetVariantId = null;
        
        try {
            const prodRes = await fetch(\`https://\$\{cleanUrl\}/admin/api/2024-01/products/\$\{PRODUCT_ID\}.json\`, {
                headers: { 'X-Shopify-Access-Token': cleanToken }
            });
            const prodData = await prodRes.json();
            if (prodData.product && prodData.product.variants && prodData.product.variants.length > 0) {
                targetVariantId = prodData.product.variants[0].id;
            } else {
                console.error("No se pudo obtener la variante del producto:", prodData);
            }
        } catch (e) {
            console.error("Error consultando producto Shopify:", e);
        }`;

const fix = `        let targetVariantId = null;
        
        try {
            const varRes = await fetch(\`https://\$\{cleanUrl\}/admin/api/2024-01/variants/\$\{PRODUCT_ID\}.json\`, {
                headers: { 'X-Shopify-Access-Token': cleanToken }
            });
            const varData = await varRes.json();
            
            if (varData.variant) {
                targetVariantId = varData.variant.id;
            } else {
                const prodRes = await fetch(\`https://\$\{cleanUrl\}/admin/api/2024-01/products/\$\{PRODUCT_ID\}.json\`, {
                    headers: { 'X-Shopify-Access-Token': cleanToken }
                });
                const prodData = await prodRes.json();
                if (prodData.product && prodData.product.variants && prodData.product.variants.length > 0) {
                    targetVariantId = prodData.product.variants[0].id;
                } else {
                    console.error("No se pudo obtener el Variant ID en Shopify (ni como Product ni como Variant):", varData, prodData);
                }
            }
        } catch (e) {
            console.error("Error consultando Shopify:", e);
        }`;

content = content.replace(target, fix);
fs.writeFileSync('server/index.js', content);
console.log("Patched Shopify Variant lookup");
