const fs = require('fs');
let c = fs.readFileSync('src/components/KnowledgeBase.jsx', 'utf8');

// 1. Añadir currentUser y users a las props
c = c.replace(/const StoresManagerModal = \(\{ stores, fetchStores, onClose, serverUrl \}\) => \{/g, "const StoresManagerModal = ({ stores, fetchStores, onClose, serverUrl, currentUser, users }) => {");

// 2. Modificar la invocación
c = c.replace(/<StoresManagerModal \n\s*stores=\{stores\}\n\s*fetchStores=\{fetchStores\}\n\s*onClose=\{\(\) => setIsStoresModalOpen\(false\)\}\n\s*serverUrl=\{serverUrl\}\n\s*\/>/s, `<StoresManagerModal 
          stores={stores} 
          fetchStores={fetchStores} 
          onClose={() => setIsStoresModalOpen(false)} 
          serverUrl={serverUrl} 
          currentUser={currentUser} 
          users={users} 
        />`);

fs.writeFileSync('src/components/KnowledgeBase.jsx', c);
console.log("Inyección en KnowledgeBase.jsx exitosa");
