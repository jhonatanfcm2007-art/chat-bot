const fs = require('fs');
let c = fs.readFileSync('src/components/KnowledgeBase.jsx', 'utf8');

c = c.replace(/<StoresManagerModal\s+stores=\{stores\}\s+fetchStores=\{fetchStores\}\s+onClose=\{\(\) => setIsStoresModalOpen\(false\)\}\s+serverUrl=\{serverUrl\}\s+\/>/, `<StoresManagerModal 
          stores={stores} 
          fetchStores={fetchStores} 
          onClose={() => setIsStoresModalOpen(false)} 
          serverUrl={serverUrl} 
          currentUser={currentUser} 
          users={users} 
        />`);

fs.writeFileSync('src/components/KnowledgeBase.jsx', c);
console.log("Inyección en KnowledgeBase.jsx corregida");
