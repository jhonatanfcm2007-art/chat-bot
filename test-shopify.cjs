const fs = require('fs');
const dbFile = 'server/db.json';
const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));

const kb = db.knowledgeBaseDb || [];
const stores = db.storesDb || [];

const chat = {
    customerName: "Juan Pérez",
    orderPhone: "50499999999",
    address: "Colonia Kennedy Bloque 4 Casa 12",
    city: "Tegucigalpa",
    province: "Francisco Morazán",
    references: "Casa blanca de dos pisos",
    from: "50499999999",
    assignedProduct: "1 Frasco Shilajit"
};

const products = "1 Frasco Shilajit";

let SHOPIFY_URL = null;
let SHOPIFY_TOKEN = null;
let PRODUCT_ID = null;
let targetStoreId = null;

const searchName = chat.assignedProduct || products || '';
let prod = kb.find(p => p.name === searchName);
if (!prod) {
    prod = kb.find(p => {
        const lowerKBName = p.name.toLowerCase();
        const lowerSearchName = searchName.toLowerCase();
        return lowerSearchName.includes(lowerKBName) || lowerKBName.includes(lowerSearchName);
    });
}

if (!prod) {
    console.log("No product found!");
    process.exit(1);
}
console.log("Found product:", prod.name);

targetStoreId = prod.defaultStoreId;
let targetProductId = prod.defaultShopifyProductId || prod.shopifyProductId;

// Simulate variation logic
const cleanFrom = chat.from.replace(/\D/g, '');
const cleanOrderPhone = chat.orderPhone.replace(/\D/g, '');
const detectPhone = cleanOrderPhone.length > 8 ? cleanOrderPhone : cleanFrom;
if (prod.priceVariations) {
    const variation = prod.priceVariations.find(v => v.prefix && detectPhone.startsWith(v.prefix.replace(/\D/g, '')));
    if (variation) {
        if (variation.storeId) targetStoreId = variation.storeId;
        if (variation.shopifyProductId) targetProductId = variation.shopifyProductId;
        console.log("Found variation for prefix:", variation.prefix);
    }
}

console.log("Target Store ID:", targetStoreId);

if (targetStoreId) {
    const store = stores.find(s => s.id === targetStoreId);
    if (store) {
        SHOPIFY_URL = store.shopifyStoreUrl;
        SHOPIFY_TOKEN = store.shopifyAccessToken;
        PRODUCT_ID = targetProductId || PRODUCT_ID;
    } else {
        console.log("Store ID not found in storesDb!");
    }
} else if (prod.shopifyStoreUrl && prod.shopifyAccessToken) {
    SHOPIFY_URL = prod.shopifyStoreUrl;
    SHOPIFY_TOKEN = prod.shopifyAccessToken;
    PRODUCT_ID = prod.shopifyProductId || PRODUCT_ID;
}

if (!SHOPIFY_URL || !SHOPIFY_TOKEN) {
    console.log("Failed to resolve SHOPIFY_URL or TOKEN!");
    process.exit(1);
}

console.log("SHOPIFY URL:", SHOPIFY_URL);
console.log("Token starts with:", SHOPIFY_TOKEN.substring(0, 5));
