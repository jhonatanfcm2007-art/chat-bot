import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const target = `        let targetVariantId = null;
        
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

const fix = `        let targetVariantId = null;
        
        try {
            if (PRODUCT_ID) {
                // 1. Try Variant ID directly
                const varRes = await fetch(\`https://\$\{cleanUrl\}/admin/api/2024-01/variants/\$\{PRODUCT_ID\}.json\`, { headers: { 'X-Shopify-Access-Token': cleanToken } });
                const varData = await varRes.json();
                
                if (varData.variant) {
                    targetVariantId = varData.variant.id;
                } else {
                    // 2. Try Product ID
                    const prodRes = await fetch(\`https://\$\{cleanUrl\}/admin/api/2024-01/products/\$\{PRODUCT_ID\}.json\`, { headers: { 'X-Shopify-Access-Token': cleanToken } });
                    const prodData = await prodRes.json();
                    if (prodData.product && prodData.product.variants && prodData.product.variants.length > 0) {
                        targetVariantId = prodData.product.variants[0].id;
                    }
                }
            }
            
            // 3. Fallback: Search Shopify by exact Name if no ID provided or ID failed
            if (!targetVariantId && prod && prod.name) {
                console.log("Y" Buscando producto en Shopify por nombre:", prod.name);
                const searchRes = await fetch(\`https://\$\{cleanUrl\}/admin/api/2024-01/products.json?title=\$\{encodeURIComponent(prod.name)\}\`, { headers: { 'X-Shopify-Access-Token': cleanToken } });
                const searchData = await searchRes.json();
                
                if (searchData.products && searchData.products.length > 0) {
                    const shopifyProduct = searchData.products[0];
                    if (shopifyProduct.variants && shopifyProduct.variants.length > 0) {
                        targetVariantId = shopifyProduct.variants[0].id;
                        console.log("o. Producto encontrado en Shopify por nombre. Variant ID:", targetVariantId);
                    }
                }
            }
            
            // 4. Fuzzy fallback if exact name failed
            if (!targetVariantId && prod && prod.name) {
                const searchRes = await fetch(\`https://\$\{cleanUrl\}/admin/api/2024-01/products.json\`, { headers: { 'X-Shopify-Access-Token': cleanToken } });
                const searchData = await searchRes.json();
                if (searchData.products) {
                    const fuzzyMatch = searchData.products.find(p => p.title.toLowerCase().includes(prod.name.toLowerCase()) || prod.name.toLowerCase().includes(p.title.toLowerCase()));
                    if (fuzzyMatch && fuzzyMatch.variants && fuzzyMatch.variants.length > 0) {
                        targetVariantId = fuzzyMatch.variants[0].id;
                        console.log("o. Producto encontrado en Shopify (Difuso). Variant ID:", targetVariantId);
                    }
                }
            }
            
        } catch (e) {
            console.error("Error consultando Shopify:", e);
        }`;

content = content.replace(target, fix);
fs.writeFileSync('server/index.js', content);
console.log("Patched Shopify Name Search fallback");
