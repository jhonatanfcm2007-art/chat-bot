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
    status: 'Available',
    provider: ''
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
        acc.id === editingAccount.id ? { ...acc, ...processedFormData, price: parseInt(formData.price) || 0, cost: parseInt(formData.cost) || 0, provider: formData.provider } : acc
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
      status: account.status,
      provider: account.provider || ''
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
    setFormData({ service: '', email: '', profile: '', pass: '', price: '', cost: '', uses: '3', status: 'Available', provider: '' });

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





  return    <div className="flex-grow p-4 md:p-8 bg-background overflow-y-auto relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-on-surface">Gestión de Inventario</h1>
          <p className="text-on-surface-variant text-[11px] md:text-sm mt-1">Administra tu stock de streaming y precios</p>
        </div>

        <button 
          onClick={() => { closeModal(); setIsModalOpen(true); }}
          className="w-full md:w-auto bg-primary text-white font-bold px-6 py-3 md:py-2.5 rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nueva Cuenta
        </button>
      </div>

      {/* Summary Dashboard */}
      <div className="grid grid-cols-1 gap-6 mb-8 md:mb-12">
        <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-outline-variant shadow-sm overflow-hidden transition-all duration-500 hover:shadow-xl group">
          <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-outline-variant">
            {/* Main Stats Header */}
            <div className="p-6 md:p-10 bg-panel-bg flex flex-col justify-center min-w-full md:min-w-[320px] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
               <div className="relative z-10">
                 <div className="flex items-center gap-4 mb-2 md:mb-3">
                   <div className="w-10 h-10 md:w-12 md:h-12 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                     <span className="material-symbols-outlined text-xl md:text-2xl">inventory_2</span>
                   </div>
                   <h2 className="text-white font-black text-xl md:text-2xl tracking-tight leading-none uppercase">Stock Real</h2>
                 </div>
                 <p className="text-[9px] md:text-[10px] text-panel-on-bg/40 font-black uppercase tracking-[0.2em]">Cálculo dinámico de cupos</p>
               </div>
            </div>

            {/* Platform Grid Area */}
            <div className="flex-grow p-6 md:p-10 bg-white grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {Object.entries(statsByService).length > 0 ? (
                Object.entries(statsByService).map(([key, data]) => (
                  <div key={key} className="flex flex-col gap-1 md:gap-2">
                    <span className="text-[9px] md:text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest truncate">{data.displayName}</span>
                    <div className="flex items-baseline gap-1.5 md:gap-2">
                      <span className="text-2xl md:text-3xl font-black text-on-surface">{data.totalSlots}</span>
                      <span className="text-[8px] md:text-[9px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">Cupos</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-2 flex flex-col items-center justify-center text-on-surface-variant/20">
                  <span className="material-symbols-outlined text-4xl mb-2">refresh</span>
                  <p className="text-[9px] font-black uppercase tracking-widest">Sincronizando...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Table/Card View */}
      <div className="space-y-4 md:space-y-0">
        {/* Mobile Cards (View for small screens) */}
        <div className="md:hidden space-y-4">
          {accounts.map((acc) => (
            <div key={acc.id} className="bg-white p-6 rounded-3xl border border-outline-variant shadow-sm relative overflow-hidden">
               {/* Accent line for status */}
               <div className={`absolute left-0 top-0 bottom-0 w-1 ${acc.status === 'Available' ? 'bg-tertiary' : 'bg-on-surface-variant/20'}`}></div>
               
               <div className="flex justify-between items-start mb-4">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                     <span className="material-symbols-outlined">tv</span>
                   </div>
                   <div>
                     <h3 className="font-black text-on-surface text-base">{acc.service}</h3>
                     <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest opacity-60">{acc.provider || 'Sin Proveedor'}</p>
                   </div>
                 </div>
                 <div className="text-right">
                    <p className="text-lg font-black text-primary">${acc.price.toLocaleString()}</p>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                      acc.status === 'Available' ? 'bg-tertiary/10 text-tertiary' : 'bg-on-surface-variant/10 text-on-surface-variant'
                    }`}>
                      {acc.status === 'Available' ? 'Disponible' : 'Vendido'}
                    </span>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4 py-4 border-y border-outline-variant/50 mb-4">
                 <div>
                   <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest block mb-1">Credenciales</span>
                   <p className="text-xs font-bold text-on-surface truncate">{acc.email}</p>
                   <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">{acc.pass}</p>
                 </div>
                 <div className="text-right">
                   <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest block mb-1">Cupos Disp.</span>
                   <div className="flex items-center justify-end gap-1.5">
                     <span className="text-lg font-black text-on-surface">{acc.uses}</span>
                     <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                   </div>
                 </div>
               </div>

               <div className="flex gap-2">
                 <button 
                   onClick={() => onSale(acc)}
                   disabled={acc.uses <= 0}
                   className={`flex-grow flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                     acc.uses > 0 ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-secondary-bg text-on-surface-variant/30 cursor-not-allowed'
                   }`}
                 >
                   <span className="material-symbols-outlined text-sm">local_mall</span>
                   Vender
                 </button>
                 <button 
                   onClick={() => handleEditAccount(acc)}
                   className="w-12 h-12 bg-secondary-bg flex items-center justify-center rounded-2xl text-on-surface-variant"
                 >
                   <span className="material-symbols-outlined text-xl">edit</span>
                 </button>
                 <button 
                   onClick={() => handleDeleteAccount(acc.id)}
                   className="w-12 h-12 bg-red-50 flex items-center justify-center rounded-2xl text-error"
                 >
                   <span className="material-symbols-outlined text-xl">delete</span>
                 </button>
               </div>
            </div>
          ))}
        </div>

        {/* Desktop Table (Hidden on mobile) */}
        <div className="hidden md:block bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary-bg/50 border-b border-outline-variant">
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Servicio</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Perfil</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Credenciales</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Finanzas</th>
                <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Proveedor</th>
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
                    <span className="text-xs font-bold text-on-surface bg-secondary-bg px-2 py-1 rounded-lg border border-outline-variant/30">
                      {acc.provider || 'N/A'}
                    </span>
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
    </div>
      </div>
    </div>
  );
};

export default Inventory;
