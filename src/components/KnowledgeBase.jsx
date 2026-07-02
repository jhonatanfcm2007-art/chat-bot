import React, { useState, useEffect } from 'react';

const KnowledgeBase = ({ serverUrl }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${serverUrl}/api/knowledge-base`);
      const data = await res.json();
      setProducts(data);
    } catch (e) {
      console.error('Error fetching knowledge base:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const isNew = !editingProduct.id;
    const url = isNew 
      ? `${serverUrl}/api/knowledge-base` 
      : `${serverUrl}/api/knowledge-base/${editingProduct.id}`;
    
    try {
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProduct)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchProducts();
      }
    } catch (e) {
      console.error('Error saving product:', e);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que quieres eliminar este producto de la Base de Conocimiento?')) return;
    try {
      const res = await fetch(`${serverUrl}/api/knowledge-base/${id}`, { method: 'DELETE' });
      if (res.ok) fetchProducts();
    } catch (e) {
      console.error('Error deleting product:', e);
    }
  };

  const openNewModal = () => {
    setEditingProduct({ name: '', keywords: [], prices: '', details: '', line: 'Ambas' });
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct({ line: 'Ambas', ...product });
    setIsModalOpen(true);
  };

  return (
    <div className="flex-1 bg-slate-50 overflow-hidden flex flex-col relative w-full h-full max-w-[1200px] mx-auto p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-800">Base de Conocimiento</h1>
          <p className="text-slate-500 text-sm mt-1">Configura el cerebro de ventas por producto</p>
        </div>
        <button 
          onClick={openNewModal}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/30 transition-all"
        >
          <span className="material-symbols-outlined">add</span>
          Nuevo Producto
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-slate-400">
            <span className="material-symbols-outlined text-6xl mb-2 opacity-50">menu_book</span>
            <p className="font-semibold text-lg text-slate-600">Base de conocimiento vacía</p>
            <p className="text-sm">Agrega tu primer producto para que la IA sepa qué vender.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {products.map(p => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">inventory_2</span>
                    {p.name}
                  </h3>
                  <div className="flex gap-2 items-center">
                    <span className={`text-xs px-2 py-1 rounded-md font-semibold border ${
                      p.line === '1' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
                      p.line === '2' ? 'bg-purple-50 text-purple-600 border-purple-200' : 
                      'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}>
                      {p.line === '1' ? 'Línea 1' : p.line === '2' ? 'Línea 2' : 'Ambas Líneas'}
                    </span>
                    <button onClick={() => openEditModal(p)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600 flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
                
                <div className="mb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Palabras Clave (Activación):</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.keywords?.map((k, i) => (
                      <span key={i} className="bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex-1 mb-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Beneficios / Pitch:</span>
                  <p className="text-sm text-slate-700 mt-1 line-clamp-3 bg-slate-50 p-2 rounded-lg border border-slate-100">{p.details}</p>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase">Precios:</span>
                  <p className="text-sm text-slate-700 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100 whitespace-pre-line">{p.prices}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">{editingProduct.id ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="overflow-y-auto p-6 flex flex-col gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del Producto</label>
                <input 
                  type="text" required
                  value={editingProduct.name}
                  onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Ej. Zapatos Deportivos X"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Asignar a WhatsApp</label>
                <select 
                  value={editingProduct.line || 'Ambas'}
                  onChange={e => setEditingProduct({...editingProduct, line: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option value="Ambas">Ambas Líneas (Global)</option>
                  <option value="1">Línea 1</option>
                  <option value="2">Línea 2</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">El asistente solo venderá este producto en la línea seleccionada.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Palabras Clave (separadas por coma)</label>
                <input 
                  type="text" required
                  value={editingProduct.keywords.join(', ')}
                  onChange={e => setEditingProduct({...editingProduct, keywords: e.target.value.split(',').map(k=>k.trim()).filter(k=>k)})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Ej. zapatos, tenis, zapatillas deportivas"
                />
                <p className="text-xs text-slate-500 mt-1">Si el cliente dice alguna de estas palabras, la IA sabrá que busca este producto.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Detalles y Beneficios (Pitch de Ventas)</label>
                <textarea 
                  required rows={4}
                  value={editingProduct.details}
                  onChange={e => setEditingProduct({...editingProduct, details: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  placeholder="Instrucciones para la IA: Beneficios principales, cómo se usa, para quién es..."
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Precios y Combos</label>
                <textarea 
                  required rows={3}
                  value={editingProduct.prices}
                  onChange={e => setEditingProduct({...editingProduct, prices: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  placeholder="- 1 Unidad: $50\n- 2 Unidades: $90 (Ahorras $10)"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 rounded-xl font-bold text-white bg-primary hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30">
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
