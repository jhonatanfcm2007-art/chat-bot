import React, { useState } from 'react';

const Inventory = ({ accounts, setAccounts, onSale }) => {
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState({

    service: '',
    email: '',
    profile: '',
    pass: '',
    price: '',
    cost: '',
    uses: '3',
    status: 'Available'
  });



  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddAccount = (e) => {
    e.preventDefault();
    const serviceName = formData.service.trim();
    if (!serviceName || !formData.email || !formData.pass) return;

    const processedFormData = {
      ...formData,
      service: serviceName
    };

    if (editingAccount) {
      // Update existing
      setAccounts(accounts.map(acc => 
        acc.id === editingAccount.id ? { ...acc, ...processedFormData, price: parseInt(formData.price) || 0, cost: parseInt(formData.cost) || 0 } : acc
      ));
    } else {
      // Add new
      const usesCount = parseInt(formData.uses) || 1;
      const newAcc = {
        id: accounts.length > 0 ? Math.max(...accounts.map(a => a.id)) + 1 : 1,
        ...processedFormData,
        price: parseInt(formData.price) || 0,
        cost: parseInt(formData.cost) || 0,
        uses: usesCount,
        originalUses: usesCount
      };
      setAccounts([newAcc, ...accounts]);
    }



    closeModal();
  };

  const handleEditAccount = (account) => {
    setEditingAccount(account);
    setFormData({
      service: account.service,
      email: account.email,
      profile: account.profile,
      pass: account.pass,
      price: account.price,
      cost: account.cost || '',
      uses: account.uses.toString(),
      status: account.status
    });

    setIsModalOpen(true);
  };


  const handleDeleteAccount = (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta cuenta?')) {
      setAccounts(accounts.filter(acc => acc.id !== id));
    }
  };


  const closeModal = () => {




    setIsModalOpen(false);
    setEditingAccount(null);
    setFormData({ service: '', email: '', profile: '', pass: '', price: '', cost: '', uses: '3', status: 'Available' });

  };

  // Metrics calculation
  const totalAvailableAccounts = accounts.filter(a => a.status === 'Available').length;
  const totalAvailableSlots = accounts
    .filter(a => a.status === 'Available')
    .reduce((sum, acc) => sum + (parseInt(acc.uses) || 0), 0);

  const statsByService = accounts
    .filter(a => a.status === 'Available' && (parseInt(a.uses) || 0) > 0)
    .reduce((acc, curr) => {
      // Normalizar para agrupar (quitar espacios y pasar a minúsculas para el ID de grupo)
      const normalizedName = curr.service.trim().toLowerCase();
      
      if (!acc[normalizedName]) {
        acc[normalizedName] = {
          displayName: curr.service.trim(), // Guardamos el nombre tal cual para mostrarlo
          totalSlots: 0
        };
      }
      
      acc[normalizedName].totalSlots += (parseInt(curr.uses) || 0);
      return acc;
    }, {});





  return (
    <div className="flex-grow p-8 bg-background overflow-y-auto relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black text-on-surface">Gestión de Inventario</h1>
          <p className="text-on-surface-variant text-sm mt-1">Administra tu stock de streaming y precios</p>
        </div>

        <button 
          onClick={() => { closeModal(); setIsModalOpen(true); }}
          className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nueva Cuenta
        </button>

      </div>

      {/* Summary Dashboard */}
      <div className="grid grid-cols-1 gap-6 mb-12">
        <div className="bg-white rounded-[2rem] border border-outline-variant shadow-sm overflow-hidden transition-all duration-500 hover:shadow-xl group">
          <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-outline-variant">
            {/* Main Stats Header */}
            <div className="p-10 bg-panel-bg flex flex-col justify-center min-w-[320px] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
               <div className="relative z-10">
                 <div className="flex items-center gap-4 mb-3">
                   <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                     <span className="material-symbols-outlined text-2xl">inventory_2</span>
                   </div>
                   <h2 className="text-white font-black text-2xl tracking-tight leading-none uppercase">Stock Real</h2>
                 </div>
                 <p className="text-[10px] text-panel-on-bg/40 font-black uppercase tracking-[0.2em]">Cálculo dinámico de cupos disponibles</p>
               </div>
            </div>

            {/* Platform Grid Area */}
            <div className="flex-grow p-10 bg-white grid grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(statsByService).length > 0 ? (
                Object.entries(statsByService).map(([key, data]) => (
                  <div key={key} className="flex flex-col gap-2">
                    <span className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">{data.displayName}</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-on-surface">{data.totalSlots}</span>
                      <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">Cupos</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-2 flex flex-col items-center justify-center text-on-surface-variant/20">
                  <span className="material-symbols-outlined text-5xl mb-2">refresh</span>
                  <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Modal */}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-on-surface/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-outline-variant p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-on-surface">
                {editingAccount ? 'Editar Cuenta' : 'Agregar Nueva Cuenta'}
              </h2>

              <button 
                onClick={closeModal}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-secondary-bg transition-colors"
              >
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>

            
            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">Plataforma / Servicio</label>
                <input 
                  required
                  name="service"
                  value={formData.service}
                  onChange={handleInputChange}
                  placeholder="ej. Netflix, Disney+"
                  className="w-full bg-secondary-bg border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">Nombre del Perfil</label>
                  <input 
                    name="profile"
                    value={formData.profile}
                    onChange={handleInputChange}
                    placeholder="ej. Perfil 1"
                    className="w-full bg-secondary-bg border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">Precio Venta (COP)</label>
                  <input 
                    name="price"
                    type="number"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="12000"
                    className="w-full bg-secondary-bg border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">Costo Cuenta (Total)</label>
                  <input 
                    name="cost"
                    type="number"
                    value={formData.cost}
                    onChange={handleInputChange}
                    placeholder="8000"
                    className="w-full bg-secondary-bg border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">Cupos / Usos Totales</label>
                  <input 
                    name="uses"
                    type="number"
                    value={formData.uses}
                    onChange={handleInputChange}
                    placeholder="3"
                    className="w-full bg-secondary-bg border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">Estado de Cuenta</label>
                  <select 
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full bg-secondary-bg border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="Available">DISPONIBLE</option>
                    <option value="Sold">VENDIDO</option>
                  </select>
                </div>
              </div>



              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">Correo / Usuario</label>

                <input 
                  required
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="nombre@ejemplo.com"
                  className="w-full bg-secondary-bg border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">Contraseña</label>
                <input 
                  required
                  name="pass"
                  type="text"
                  value={formData.pass}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full bg-secondary-bg border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                />
              </div>

              
              <button 
                type="submit"
                className="w-full bg-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 mt-4 hover:opacity-90 active:scale-[0.98] transition-all"
              >
                {editingAccount ? 'Actualizar Cuenta' : 'Registrar Cuenta'}
              </button>


            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-secondary-bg/50 border-b border-outline-variant">
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Servicio</th>
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Perfil</th>
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Credenciales</th>
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Finanzas</th>
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Usos</th>
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Estado</th>
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Acciones</th>

            </tr>

          </thead>
          <tbody className="divide-y divide-outline-variant">
            {accounts.map((acc) => (
              <tr key={acc.id} className="hover:bg-background/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-lg">tv</span>
                    </div>
                    <span className="font-bold text-on-surface">{acc.service}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-on-surface-variant">{acc.profile}</td>
                <td className="px-6 py-4">
                  <p className="text-xs font-medium text-on-surface">{acc.email}</p>
                  <p className="text-[10px] text-on-surface-variant font-mono">{acc.pass}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-primary leading-none text-sm">${acc.price.toLocaleString()}</p>
                  <p className="text-[10px] text-on-surface-variant font-bold mt-1 tracking-tighter uppercase opacity-60">Costo: ${acc.cost?.toLocaleString() || 0}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    <span className="text-sm font-black text-on-surface">{acc.uses}</span>
                    <span className="text-[10px] text-on-surface-variant font-bold">CUPOS</span>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                    acc.status === 'Available' ? 'bg-tertiary/10 text-tertiary' : 'bg-on-surface-variant/10 text-on-surface-variant'
                  }`}>
                    {acc.status === 'Available' ? 'DISPONIBLE' : 'VENDIDO'}
                  </span>
                </td>


                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onSale(acc)}
                      disabled={acc.uses <= 0}
                      className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                        acc.uses > 0 ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-secondary-bg text-on-surface-variant/30 cursor-not-allowed'
                      }`}
                      title="Registrar Venta"
                    >
                      <span className="material-symbols-outlined text-lg">local_mall</span>
                    </button>
                    <button 
                      onClick={() => handleEditAccount(acc)}

                      className="p-2 hover:bg-secondary-bg rounded-lg text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button 
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-on-surface-variant hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </td>



              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inventory;
