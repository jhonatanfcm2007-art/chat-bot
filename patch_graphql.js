import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const target = `            // 3. Fallback: Search Shopify by exact Name if no ID provided or ID failed
            if (!targetVariantId && prod && prod.name) {
                const searchRes = await fetch(\`https://\$\{cleanUrl\}/admin/api/2024-01/products.json?title=\$\{encodeURIComponent(prod.name)\}\`, { headers: { 'X-Shopify-Access-Token': cleanToken } });
                const searchData = await searchRes.json();
                
                if (searchData.products && searchData.products.length > 0) {
                    const shopifyProduct = searchData.products[0];
                    if (shopifyProduct.variants && shopifyProduct.variants.length > 0) {
                        targetVariantId = shopifyProduct.variants[0].id;
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
                    }
                }
            }`;

const fix = `            // 3. Fallback Mejorado: GraphQL Search (encuentra en todo el catálogo de Shopify, no solo 50)
            if (!targetVariantId && prod && prod.name) {
                // Tomamos la primera palabra clave del producto (ej: "Neurophaty") para la búsqueda por si hay typos en "Cream" o "x2"
                const baseName = prod.name.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
                
                if (baseName.length > 2) {
                    const gqlQuery = {
                        query: \`query getProducts($query: String!) {
                            products(first: 10, query: $query) {
                                edges {
                                    node {
                                        id
                                        title
                                        variants(first: 1) {
                                            edges {
                                                node {
                                                    id
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }\`,
                        variables: { query: \`title:*\$\{baseName\}*\` }
                    };
                    
                    const gqlRes = await fetch(\`https://\$\{cleanUrl\}/admin/api/2024-01/graphql.json\`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': cleanToken },
                        body: JSON.stringify(gqlQuery)
                    });
                    
                    const gqlData = await gqlRes.json();
                    const edges = gqlData?.data?.products?.edges || [];
                    
                    if (edges.length > 0) {
                        // Extraer el ID numérico de la variante, Shopify devuelve gid://shopify/ProductVariant/12345
                        const rawVariantId = edges[0].node.variants.edges[0]?.node?.id;
                        if (rawVariantId) {
                            targetVariantId = rawVariantId.split('/').pop();
                            console.log("o. Encontrado vía GraphQL Shopify:", targetVariantId);
                        }
                    }
                }
            }`;

if (content.includes('// 3. Fallback: Search Shopify')) {
    content = content.replace(target, fix);
    fs.writeFileSync('server/index.js', content);
    console.log("Patched Shopify GraphQL search!");
} else {
    console.log("Could not find target for GraphQL patch");
}
