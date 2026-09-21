const fs = require('fs');
let c = fs.readFileSync('src/components/KnowledgeBase.jsx', 'utf8');

c = c.replace(/<StoresManagerModal[^>]*>/, `<StoresManagerModal 
          stores={stores} 
          fetchStores={fetchStores} 
          onClose={() => setIsStoresModalOpen(false)} 
          serverUrl={serverUrl} 
          currentUser={currentUser} 
          users={users} 
        />`);

fs.writeFileSync('src/components/KnowledgeBase.jsx', c);
console.log("Inyección en KnowledgeBase.jsx exitosa ahora sí");
