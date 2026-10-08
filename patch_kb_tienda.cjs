const fs = require('fs');
let code = fs.readFileSync('src/components/KnowledgeBase.jsx', 'utf8');

const targetSelect = `<select 
                      value={editingProduct.defaultStoreId || ''}
                      onChange={e => setEditingProduct({...editingProduct, defaultStoreId: e.target.value})}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
                      required
                    >
                      <option value="" disabled>-- Selecciona una Tienda --</option>`;

const replacementSelect = `<select 
                      value={editingProduct.defaultStoreId || ''}
                      onChange={e => setEditingProduct({...editingProduct, defaultStoreId: e.target.value})}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
                    >
                      <option value="">-- Sin Tienda (Opcional) --</option>`;

if (code.includes(targetSelect)) {
    code = code.replace(targetSelect, replacementSelect);
    fs.writeFileSync('src/components/KnowledgeBase.jsx', code);
    console.log("Tienda select patched!");
} else {
    console.log("Target select not found");
}

