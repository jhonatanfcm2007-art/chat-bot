import React, { useState, useEffect } from 'react';

const KnowledgeBase = ({ serverUrl }) => {
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStoresModalOpen, setIsStoresModalOpen] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState('Todos');

  useEffect(() => {
    fetchProducts();
    fetchStores();
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

  const fetchStores = async () => {
    try {
      const res = await fetch(`${serverUrl}/api/stores`);
      const data = await res.json();
      setStores(data);
    } catch (e) {
      console.error('Error fetching stores:', e);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = { ...editingProduct };
    
    if (typeof payload.adIds === 'string') {
      payload.adIds = payload.adIds.split(',').map(k => k.trim()).filter(k => k);
    }

    const isNew = !editingProduct.id;
    const url = isNew 
      ? `${serverUrl}/api/knowledge-base` 
      : `${serverUrl}/api/knowledge-base/${editingProduct.id}`;
    
    try {
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
    setEditingProduct({ name: '', owner: 'Fernando', adIds: '', prices: '', details: '', line: 'Ambas', priceVariations: [], adminPhone: '', defaultStoreId: '', defaultShopifyProductId: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct({ 
      line: 'Ambas', 
      priceVariations: [], 
      ...product,
      adIds: product.adIds ? product.adIds.join(', ') : ''
    });
    setIsModalOpen(true);
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="h-full flex flex-col p-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">menu_book</span>
            Base de Conocimiento
          </h1>
          <p className="text-slate-500 mt-1">Entrena al asistente con tus productos, precios y flujos de venta</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <span className="material-symbols-outlined text-slate-400 text-sm mr-2">filter_alt</span>
            <select 
              value={ownerFilter}
              onChange={e => setOwnerFilter(e.target.value)}
              className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer"
            >
              <option value="Todos">Todos los Socios</option>
              <option value="Fernando">Fernando</option>
              <option value="Nicolas">Nicolás</option>
              <option value="Daniel">Daniel</option>
            </select>
          </div>
          <button 
            onClick={() => setIsStoresModalOpen(true)}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 hover:text-primary transition-all flex items-center gap-2 shadow-sm font-medium"
          >
            <span className="material-symbols-outlined">storefront</span>
            Gestionar Tiendas
          </button>
          <button 
            onClick={openNewModal}
            className="bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary-dark transition-all flex items-center gap-2 shadow-sm shadow-primary/30 font-medium"
          >
            <span className="material-symbols-outlined">add</span>
            Nuevo Producto
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center p-12 text-slate-400">
            <span className="material-symbols-outlined text-6xl mb-2 opacity-50">menu_book</span>
            <p className="font-semibold text-lg text-slate-600">Base de conocimiento vacía</p>
            <p className="text-sm">Agrega tu primer producto para que la IA sepa qué vender.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {products
              .filter(p => ownerFilter === 'Todos' || p.owner === ownerFilter)
              .map(p => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">inventory_2</span>
                      {p.name}
                    </h3>
                    <span className="inline-block mt-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-full">
                      Socio: {p.owner || 'Fernando'}
                    </span>
                  </div>
                  {p.adminPhone && (
                    <div className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 mt-1">
                      <span className="material-symbols-outlined text-sm">notifications_active</span>
                      Notifica a: {p.adminPhone}
                    </div>
                  )}
                  <div className="flex gap-2 items-center">
                    <span className={`text-xs px-2 py-1 rounded-md font-semibold border ${
                      p.line === '1' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
                      p.line === '2' ? 'bg-purple-50 text-purple-600 border-purple-200' : 
                      'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}>
                      {p.line === '1' ? 'Línea 1' : p.line === '2' ? 'Línea 2' : p.line === '3' ? 'Línea 3' : 'Ambas Líneas'}
                    </span>
                    <button onClick={() => openEditModal(p)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600 flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
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
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">{editingProduct.id ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="overflow-y-auto p-6 flex flex-col gap-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Socio / Propietario</label>
                  <select 
                    value={editingProduct.owner || 'Fernando'}
                    onChange={e => setEditingProduct({...editingProduct, owner: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all bg-white"
                  >
                    <option value="Fernando">Fernando</option>
                    <option value="Nicolas">Nicolás</option>
                    <option value="Daniel">Daniel</option>
                  </select>
                </div>
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
                  <option value="3">Línea 3</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">El asistente solo venderá este producto en la línea seleccionada.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Número para Notificaciones (Opcional)</label>
                <input 
                  type="text"
                  value={editingProduct.adminPhone || ''}
                  onChange={e => setEditingProduct({...editingProduct, adminPhone: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Ej. 573001234567"
                />
                <p className="text-xs text-slate-500 mt-1">Si dejas esto vacío, las notificaciones de ventas y alertas irán al número principal. Escríbelo con el código de país sin el + (Ej. 50499999999).</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Imagen del Producto (Opcional)</label>
                <div className="flex items-center gap-4">
                  {editingProduct.imageUrl ? (
                    <div className="relative group">
                      <img src={editingProduct.imageUrl.startsWith('http') ? editingProduct.imageUrl : `${serverUrl}${editingProduct.imageUrl}`} alt="Producto" className="w-16 h-16 object-cover rounded-lg border border-slate-300 shadow-sm" />
                      <button type="button" onClick={() => setEditingProduct({...editingProduct, imageUrl: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow hover:bg-red-600 transition-colors">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-slate-200 rounded-lg border border-slate-300 border-dashed flex items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined">image</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        
                        const formData = new FormData();
                        formData.append('file', file);
                        try {
                          const res = await fetch(`${serverUrl}/api/upload`, {
                            method: 'POST',
                            body: formData
                          });
                          const data = await res.json();
                          if (data.url) {
                            setEditingProduct({...editingProduct, imageUrl: data.url});
                          }
                        } catch (err) {
                          alert('Error al subir la imagen');
                        }
                      }}
                      className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 transition-all cursor-pointer"
                    />
                    <p className="text-xs text-slate-500 mt-1">Sube una foto. Si el cliente pide fotos, la IA la enviará automáticamente.</p>
                  </div>
                </div>
              </div>

              <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/30">
                <h3 className="text-sm font-bold text-indigo-800 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">storefront</span>
                  Tienda Shopify Principal
                </h3>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Seleccionar Tienda</label>
                    <select 
                      value={editingProduct.defaultStoreId || ''}
                      onChange={e => setEditingProduct({...editingProduct, defaultStoreId: e.target.value})}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
                    >
                      <option value="">Usar Tienda Global (Por defecto)</option>
                      {stores.map(store => (
                        <option key={store.id} value={store.id}>
                          {store.owner} - {store.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ID del Producto en esta Tienda</label>
                    <input 
                      type="text"
                      value={editingProduct.defaultShopifyProductId || editingProduct.shopifyProductId || ''}
                      onChange={e => setEditingProduct({...editingProduct, defaultShopifyProductId: e.target.value})}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
                      placeholder="Ej. 10462928404768"
                    />
                  </div>
                </div>
                <p className="text-xs text-indigo-600/70 mt-3 font-medium">Los pedidos de este producto se crearán en la tienda que elijas, a menos que especifiques una tienda diferente en las Variaciones por País.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">IDs de Anuncios (opcional, separados por coma)</label>
                <input 
                  type="text"
                  value={editingProduct.adIds || ''}
                  onChange={e => setEditingProduct({...editingProduct, adIds: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Ej. 1202131920, 39493920202"
                />
                <p className="text-xs text-slate-500 mt-1">Si un cliente llega desde un anuncio de Meta con alguno de estos IDs, la IA seleccionará este producto automáticamente.</p>
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
                <label className="block text-sm font-semibold text-slate-700 mb-1">Precios y Combos (Por Defecto)</label>
                <textarea 
                  required rows={3}
                  value={editingProduct.prices}
                  onChange={e => setEditingProduct({...editingProduct, prices: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  placeholder="- 1 Unidad: $50\n- 2 Unidades: $90 (Ahorras $10)"
                ></textarea>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-semibold text-slate-700">Variaciones de Precio por País / Prefijo</label>
                  <button 
                    type="button"
                    onClick={() => {
                      const newVariations = [...(editingProduct.priceVariations || []), { prefix: '', prices: '' }];
                      setEditingProduct({...editingProduct, priceVariations: newVariations});
                    }}
                    className="text-xs font-semibold text-primary bg-primary-light px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Añadir Variante
                  </button>
                </div>
                
                {(editingProduct.priceVariations || []).map((variation, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 mb-3 relative group">
                    <button 
                      type="button"
                      onClick={() => {
                        const newVariations = [...editingProduct.priceVariations];
                        newVariations.splice(idx, 1);
                        setEditingProduct({...editingProduct, priceVariations: newVariations});
                      }}
                      className="absolute top-2 right-2 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Prefijo (Ej. 503)</label>
                        <input 
                          type="text" required
                          value={variation.prefix}
                          onChange={e => {
                            const newVariations = [...editingProduct.priceVariations];
                            newVariations[idx].prefix = e.target.value.trim();
                            setEditingProduct({...editingProduct, priceVariations: newVariations});
                          }}
                          className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                          placeholder="Ej. 503"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Tienda Específica (Opcional)</label>
                        <select 
                          value={variation.storeId || ''}
                          onChange={e => {
                            const newVariations = [...editingProduct.priceVariations];
                            newVariations[idx].storeId = e.target.value;
                            setEditingProduct({...editingProduct, priceVariations: newVariations});
                          }}
                          className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary/50 bg-white"
                        >
                          <option value="">Usar Tienda Principal</option>
                          {stores.map(store => (
                            <option key={store.id} value={store.id}>{store.owner} - {store.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">ID Producto en esta tienda (Opcional)</label>
                        <input 
                          type="text"
                          value={variation.shopifyProductId || ''}
                          onChange={e => {
                            const newVariations = [...editingProduct.priceVariations];
                            newVariations[idx].shopifyProductId = e.target.value;
                            setEditingProduct({...editingProduct, priceVariations: newVariations});
                          }}
                          className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                          placeholder="ID en Shopify (si es diferente al principal)"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Precios para este prefijo</label>
                      <textarea 
                        required rows={2}
                        value={variation.prices}
                        onChange={e => {
                          const newVariations = [...editingProduct.priceVariations];
                          newVariations[idx].prices = e.target.value;
                          setEditingProduct({...editingProduct, priceVariations: newVariations});
                        }}
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary/50 resize-none"
                        placeholder="Precios en moneda local..."
                      ></textarea>
                    </div>
                  </div>
                ))}
                {(editingProduct.priceVariations?.length === 0 || !editingProduct.priceVariations) && (
                  <p className="text-xs text-slate-500 text-center py-2">No hay variaciones. Se usará el precio por defecto.</p>
                )}
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

      {isStoresModalOpen && (
        <StoresManagerModal 
          stores={stores} 
          fetchStores={fetchStores} 
          onClose={() => setIsStoresModalOpen(false)} 
          serverUrl={serverUrl} 
        />
      )}
    </div>
  );
};

const StoresManagerModal = ({ stores, fetchStores, onClose, serverUrl }) => {
  const [editingStore, setEditingStore] = useState(null);

  const handleSaveStore = async (e) => {
    e.preventDefault();
    const isNew = !editingStore.id;
    const url = isNew ? `${serverUrl}/api/stores` : `${serverUrl}/api/stores/${editingStore.id}`;
    try {
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingStore)
      });
      if (res.ok) {
        setEditingStore(null);
        fetchStores();
      }
    } catch (e) {
      console.error('Error saving store:', e);
    }
  };

  const handleDeleteStore = async (id) => {
    if (!window.confirm('¿Seguro que quieres eliminar esta tienda? Los productos asignados a ella volverán a su configuración global.')) return;
    try {
      const res = await fetch(`${serverUrl}/api/stores/${id}`, { method: 'DELETE' });
      if (res.ok) fetchStores();
    } catch (e) {
      console.error('Error deleting store:', e);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-[110] p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">storefront</span>
            Gestionar Tiendas Shopify
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {!editingStore ? (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm text-slate-500">Configura tiendas una sola vez para seleccionarlas fácilmente en tus productos.</p>
                <button 
                  onClick={() => setEditingStore({ owner: 'Fernando', name: '', shopifyStoreUrl: '', shopifyAccessToken: '' })}
                  className="bg-primary text-white px-3 py-1.5 rounded-lg text-sm hover:bg-primary-dark transition-all flex items-center gap-1 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Añadir Tienda
                </button>
              </div>
              
              {stores.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">storefront</span>
                  <p className="text-slate-500 font-medium">No hay tiendas configuradas</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stores.map(store => (
                    <div key={store.id} className="border border-slate-200 rounded-xl p-4 flex flex-col gap-2 hover:border-primary/50 transition-colors bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-800">{store.name}</h3>
                          <span className="inline-block bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium mt-1">
                            {store.owner}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingStore(store)} className="p-1.5 text-slate-400 hover:text-primary transition-colors bg-slate-50 rounded-lg">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button onClick={() => handleDeleteStore(store.id)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors bg-slate-50 rounded-lg">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-2 font-mono bg-slate-50 p-1.5 rounded border border-slate-100">{store.shopifyStoreUrl}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSaveStore} className="flex flex-col gap-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2">{editingStore.id ? 'Editar Tienda' : 'Nueva Tienda'}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Propietario / Socio</label>
                  <select 
                    value={editingStore.owner}
                    onChange={e => setEditingStore({...editingStore, owner: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50 bg-white"
                  >
                    <option value="Fernando">Fernando</option>
                    <option value="Nicolas">Nicolás</option>
                    <option value="Daniel">Daniel</option>
                    <option value="General">General / Empresa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre Identificador</label>
                  <input 
                    type="text" required
                    value={editingStore.name}
                    onChange={e => setEditingStore({...editingStore, name: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
                    placeholder="Ej. Honduras (Principal)"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">URL de Shopify (.myshopify.com)</label>
                  <input 
                    type="text" required
                    value={editingStore.shopifyStoreUrl}
                    onChange={e => setEditingStore({...editingStore, shopifyStoreUrl: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
                    placeholder="mitienda.myshopify.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Access Token de la App (shpat_...)</label>
                  <input 
                    type="password" required
                    value={editingStore.shopifyAccessToken}
                    onChange={e => setEditingStore({...editingStore, shopifyAccessToken: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/50"
                    placeholder="shpat_..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setEditingStore(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors shadow-sm">
                  Guardar Tienda
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
