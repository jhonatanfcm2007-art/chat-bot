const fs = require('fs');
let code = fs.readFileSync('src/components/KnowledgeBase.jsx', 'utf8');

const regex = /<select\s+value=\{editingProduct\.defaultStoreId[\s\S]*?<option value="" disabled>-- Selecciona una Tienda --<\/option>/;

const replacement = `<select 
                      value={editingProduct.defaultStoreId || ''}
                      onChange={e => setEditingProduct({...editingProduct, defaultStoreId: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                    >
                      <option value="">-- Sin Tienda (Opcional) --</option>`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/KnowledgeBase.jsx', code);
    console.log("Patched!");
} else {
    console.log("Not found.");
}
