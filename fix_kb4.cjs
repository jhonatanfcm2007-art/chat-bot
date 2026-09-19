const fs = require('fs');
let c = fs.readFileSync('src/components/KnowledgeBase.jsx', 'utf8');

c = c.replace(/value=\{editingProduct\.owner \|\| 'Fernando'\}/g, "value={editingProduct.owner || 'Fernando'}\n                      disabled={currentUser?.role !== 'admin'}\n                      title={currentUser?.role !== 'admin' ? 'Solo administradores pueden cambiar el propietario' : ''}");
c = c.replace(/onChange=\{e => setEditingStore\(\{\.\.\.editingStore, owner: e\.target\.value\}\)\}/g, "onChange={e => setEditingStore({...editingStore, owner: e.target.value})}\n                      disabled={currentUser?.role !== 'admin'}");

fs.writeFileSync('src/components/KnowledgeBase.jsx', c);
