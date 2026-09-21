import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

// Import Incidents
if (!content.includes('import Incidents')) {
    content = content.replace(
        "import Inventory from './components/Inventory';",
        "import Inventory from './components/Inventory';\nimport Incidents from './components/Incidents';"
    );
}

// Add state handling for 'incidents'
if (!content.includes(`activeTab === 'incidents'`)) {
    content = content.replace(
        /\{activeTab === 'inventory' && \(\s*<Inventory\b[^>]*\/>\s*\)\}/,
        `{activeTab === 'inventory' && ( <Inventory BACKEND_URL={SERVER_URL} /> )}\n          {activeTab === 'incidents' && ( <Incidents BACKEND_URL={SERVER_URL} socket={socket} /> )}`
    );
}

fs.writeFileSync('src/App.jsx', content);
console.log("App.jsx patched");
