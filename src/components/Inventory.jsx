import React, { useState } from 'react';

const PREDEFINED_PROFILES = ['1', '2', '3', '4', '5'];

const Inventory = ({ accounts, setAccounts, onSale, platforms, setPlatforms, providers, setProviders }) => {
  
  // Computar de forma dinámica las opciones basándose en los datos persistentes del servidor y lo que ya existe
  const availablePlatforms = Array.from(new Set([
    ...platforms,
    ...accounts.map(acc => acc.service).filter(Boolean)
  ])).sort((a, b) => a.localeCompare(b));

  const availableProviders = Array.from(new Set([
    ...providers,
    ...accounts.map(acc => acc.provider).filter(Boolean)
  ])).sort((a, b) => a.localeCompare(b));

  const availableProfiles = Array.from(new Set([
    ...PREDEFINED_PROFILES,
    ...accounts.map(acc => acc.profile).filter(Boolean)
  ])).sort((a, b) => a.localeCompare(b));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManageListsOpen, setIsManageListsOpen] = useState(false);
  const [showCustomPlatform, setShowCustomPlatform] = useState(false);
  const [showCustomProvider, setShowCustomProvider] = useState(false);
  const [showCustomProfile, setShowCustomProfile] = useState(false);

  const [newPlatformInput, setNewPlatformInput] = useState('');
  const [newProviderInput, setNewProviderInput] = useState('');

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

    const usesCount = parseInt(formData.uses) || 0;
    const computedStatus = usesCount > 0 ? 'Available' : 'Sold';

    const processedFormData = {
      ...formData,
      service: serviceName,
      status: computedStatus,
      uses: usesCount
    };

    // Si es una plataforma nueva que no estaba en la lista, guardarla
    if (!platforms.includes(serviceName)) {
      setPlatforms(prev => [...prev, serviceName]);
    }

    // Si es un proveedor nuevo que no estaba en la lista, guardarlo
    if (formData.provider && !providers.includes(formData.provider)) {
      setProviders(prev => [...prev, formData.provider]);
    }

    if (editingAccount) {
      // Update existing
      setAccounts(accounts.map(acc => 
        acc.id === editingAccount.id ? { 
          ...acc, 
          ...processedFormData, 
          price: parseInt(formData.price) || 0, 
          cost: parseInt(formData.cost) || 0, 
          provider: formData.provider 
        } : acc
      ));
    } else {
      // Add new
      const newAcc = {
        id: accounts.length > 0 ? Math.max(...accounts.map(a => a.id)) + 1 : 1,
        ...processedFormData,
        price: parseInt(formData.price) || 0,
        cost: parseInt(formData.cost) || 0,
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
    setIsManageListsOpen(false);
    setShowCustomPlatform(false);
    setShowCustomProvider(false);
    setShowCustomProfile(false);
    setEditingAccount(null);
    setFormData({ service: '', email: '', profile: '', pass: '', price: '', cost: '', uses: '3', status: 'Available', provider: '' });
  };

  const handleEditPlatformName = (oldName, newName) => {
    if (!newName.trim() || oldName === newName) return;
    setPlatforms(platforms.map(p => p === oldName ? newName : p));
    setAccounts(accounts.map(acc => acc.service === oldName ? { ...acc, service: newName } : acc));
  };

  const handleDeletePlatform = (name) => {
    if (window.confirm(`¿Eliminar "${name}" de la lista de plataformas?`)) {
      setPlatforms(platforms.filter(p => p !== name));
    }
  };

  const handleEditProviderName = (oldName, newName) => {
    if (!newName.trim() || oldName === newName) return;
    setProviders(providers.map(p => p === oldName ? newName : p));
    setAccounts(accounts.map(acc => acc.provider === oldName ? { ...acc, provider: newName } : acc));
  };

  const handleDeleteProvider = (name) => {
    if (window.confirm(`¿Eliminar "${name}" de la lista de proveedores?`)) {
      setProviders(providers.filter(p => p !== name));
    }
  };

  const handleAddPlatform = () => {
    if (newPlatformInput.trim() && !platforms.includes(newPlatformInput.trim())) {
      setPlatforms([...platforms, newPlatformInput.trim()]);
      setNewPlatformInput('');
    }
  };

  const handleAddProvider = () => {
    if (newProviderInput.trim() && !providers.includes(newProviderInput.trim())) {
      setProviders([...providers, newProviderInput.trim()]);
      setNewProviderInput('');
    }
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
    <div className="flex-grow p-4 md:p-8 bg-background overflow-y-auto custom-scrollbar relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight font-headline">Inventory</h1>
          <p className="text-on-surface-variant text-sm mt-1 font-medium opacity-60">Manage your streaming stock and pricing</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <button 
            onClick={() => setIsManageListsOpen(true)}
            className="glass transition-all flex items-center justify-center gap-3 active:scale-95 px-6 py-3 rounded-2xl hover:bg-black/5"
          >
            <span className="material-symbols-outlined text-xl text-primary font-bold">tune</span>
            <span className="font-bold text-on-surface">Configure Lists</span>
          </button>
          <button 
            onClick={() => { closeModal(); setIsModalOpen(true); }}
            className="bg-primary text-on-primary font-black px-8 py-3 rounded-2xl shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined text-xl">add_circle</span>
            Add Account
          </button>
        </div>
      </div>

      {/* Summary Dashboard */}
      <div className="mb-10 w-full overflow-hidden">
        <div className="glass rounded-[2rem] flex items-center h-14 md:h-16 overflow-hidden">
          {/* Main Stats Header */}
          <div className="bg-secondary-bg h-full flex items-center px-6 md:px-10 relative z-10 border-r border-outline-variant flex-shrink-0">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-8 h-8 md:w-9 md:h-9 bg-primary/10 text-primary rounded-xl flex items-center justify-center border border-primary/20 shadow-sm">
                <span className="material-symbols-outlined text-lg md:text-xl">database</span>
              </div>
              <h2 className="text-on-surface font-black text-xs md:text-sm tracking-[0.2em] uppercase leading-none mt-0.5">Real Stock</h2>
            </div>
          </div>

          {/* Platform Bubbles Area */}
          <div className="flex-grow h-full flex gap-4 md:gap-5 items-center px-6 md:px-8 overflow-x-auto custom-scrollbar scrollbar-hide">
            {Object.entries(statsByService).length > 0 ? (
              Object.entries(statsByService).map(([key, data]) => (
                <div key={key} className="flex items-center gap-3 flex-shrink-0 bg-secondary-bg border border-outline-variant rounded-2xl px-5 py-2 hover:bg-white hover:border-primary/20 transition-all cursor-default group shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(79,70,229,0.3)] group-hover:scale-125 transition-transform"></span>
                  <span className="text-[10px] md:text-[11px] font-black text-on-surface-variant uppercase tracking-widest opacity-80 group-hover:opacity-100">{data.displayName}</span>
                  <span className="text-sm md:text-base font-black text-on-surface leading-none ml-1">{data.totalSlots}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-3 text-on-surface-variant/40 flex-shrink-0 pl-2">
                <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Synchronizing Vault...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-md rounded-[2.5rem] shadow-2xl border border-outline-variant p-10 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-on-surface tracking-tight">
                {editingAccount ? 'Update Account' : 'Register Service'}
              </h2>
              <button 
                onClick={closeModal}
                className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5"
              >
                <span className="material-symbols-outlined text-on-surface opacity-60 hover:opacity-100">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddAccount} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2.5 ml-1 opacity-50">Platform / Service</label>
                  
                  <div className="flex gap-2">
                    {!showCustomPlatform ? (
                      <>
                        <select 
                          required
                          name="service"
                          value={formData.service}
                          onChange={handleInputChange}
                          className="flex-grow bg-white/5 border border-white/5 rounded-2xl py-3.5 px-5 text-sm font-bold text-white focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                        >
                          <option value="" disabled className="bg-secondary-bg">Select platform...</option>
                          {availablePlatforms.map(platform => (
                            <option key={platform} value={platform} className="bg-secondary-bg">{platform}</option>
                          ))}
                        </select>
                        <button 
                          type="button"
                          onClick={() => { setShowCustomPlatform(true); setFormData(prev => ({...prev, service: ''})); }}
                          className="bg-primary/20 text-primary px-5 rounded-2xl flex items-center justify-center hover:bg-primary/30 transition-all border border-primary/20"
                        >
                          <span className="material-symbols-outlined font-black">add</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <input 
                          required
                          name="service"
                          value={formData.service}
                          onChange={handleInputChange}
                          placeholder="Platform name..."
                          className="flex-grow bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 transition-all placeholder:opacity-30"
                        />
                        <button 
                          type="button"
                          onClick={() => { setShowCustomPlatform(false); setFormData(prev => ({...prev, service: ''})); }}
                          className="bg-slate-100 text-on-surface/40 px-5 rounded-2xl flex items-center justify-center hover:bg-error/10 hover:text-error transition-all border border-slate-200"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2.5 ml-1 opacity-50">Provider</label>
                  <div className="flex gap-2">
                    {!showCustomProvider ? (
                      <>
                        <select 
                          name="provider"
                          value={formData.provider}
                          onChange={handleInputChange}
                          className="flex-grow bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                        >
                          <option value="" disabled className="text-on-surface">Select provider...</option>
                          {availableProviders.map(provider => (
                            <option key={provider} value={provider} className="text-on-surface">{provider}</option>
                          ))}
                        </select>
                        <button 
                          type="button"
                          onClick={() => { setShowCustomProvider(true); setFormData(prev => ({...prev, provider: ''})); }}
                          className="bg-primary/20 text-primary px-5 rounded-2xl flex items-center justify-center hover:bg-primary/30 transition-all border border-primary/20"
                        >
                          <span className="material-symbols-outlined font-black">add</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <input 
                          name="provider"
                          value={formData.provider}
                          onChange={handleInputChange}
                          placeholder="Provider name..."
                          className="flex-grow bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 transition-all placeholder:opacity-30"
                        />
                        <button 
                          type="button"
                          onClick={() => { setShowCustomProvider(false); setFormData(prev => ({...prev, provider: ''})); }}
                          className="bg-slate-100 text-on-surface/40 px-5 rounded-2xl flex items-center justify-center hover:bg-error/10 hover:text-error transition-all border border-slate-200"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 g                  <div>
                    <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2.5 ml-1 opacity-50">Profile Num</label>
                    <select 
                      required
                      name="profile"
                      value={formData.profile}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                    >
                      <option value="" disabled className="text-on-surface">N#</option>
                      {availableProfiles.map(p => (
                        <option key={p} value={p} className="text-on-surface">{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2.5 ml-1 opacity-50">Total Slots</label>
                    <input 
                      name="uses"
                      type="number"
                      value={formData.uses}
                      onChange={handleInputChange}
                      placeholder="3"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2.5 ml-1 opacity-50">Cost (Full)</label>
                    <input 
                      name="cost"
                      type="number"
                      value={formData.cost}
                      onChange={handleInputChange}
                      placeholder="8000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2.5 ml-1 opacity-50">Price (Unit)</label>
                    <input 
                      name="price"
                      type="number"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="12000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2.5 ml-1 opacity-50">Credentials (Email)</label>
                  <input 
                    required
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="example@stream.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2.5 ml-1 opacity-50">Secret Code (Password)</label>
                  <input 
                    required
                    name="pass"
                    type="text"
                    value={formData.pass}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-5 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                  />
                </div>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-primary text-on-primary font-black py-4 rounded-[1.5rem] shadow-2xl shadow-primary/20 mt-6 hover:opacity-90 active:scale-[0.98] transition-all uppercase tracking-widest text-xs"
              >
                {editingAccount ? 'Finalize Changes' : 'Seal Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manage Lists Modal */}
      {isManageListsOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-2xl rounded-[3rem] shadow-2xl border border-slate-200 p-10 animate-in zoom-in-95 duration-200 h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-on-surface tracking-tight uppercase">Master Config</h2>
              <button 
                onClick={() => setIsManageListsOpen(false)}
                className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-slate-200 transition-all border border-slate-200"
              >
                <span className="material-symbols-outlined text-on-surface/60">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 overflow-y-auto custom-scrollbar pr-4">
              {/* Platforms Section */}
              <div>
                <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg">category</span>
                  Platforms
                </h3>
                  <div className="flex gap-2 mb-4 bg-primary/5 p-2 rounded-2xl border border-dashed border-primary/20 group focus-within:border-primary/40 transition-all">
                    <input 
                      type="text"
                      placeholder="Add Platform..."
                      value={newPlatformInput}
                      onChange={(e) => setNewPlatformInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddPlatform()}
                      className="flex-grow bg-transparent border-none rounded-xl py-2.5 px-4 text-xs font-black text-on-surface focus:ring-0 placeholder:text-on-surface-variant/40"
                    />
                    <button 
                      onClick={handleAddPlatform}
                      className="w-10 h-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center hover:bg-primary/30 transition-all border border-primary/20"
                    >
                      <span className="material-symbols-outlined text-lg">add</span>
                    </button>
                  </div>
                  <div className="space-y-3">
                    {platforms.map(platform => (
                      <div key={platform} className="flex items-center gap-3 group bg-slate-50 p-2 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                        <input 
                          type="text"
                          defaultValue={platform}
                          onBlur={(e) => handleEditPlatformName(platform, e.target.value)}
                          className="flex-grow bg-transparent border-none rounded-xl py-2.5 px-4 text-xs font-black text-on-surface focus:ring-0 transition-all"
                        />
                        <button 
                          onClick={() => handleDeletePlatform(platform)}
                          className="w-10 h-10 flex items-center justify-center text-on-surface/10 group-hover:text-error transition-all"
                        >
                          <span className="material-symbols-outlined text-lg">delete_sweep</span>
                        </button>
                      </div>
                    ))}
                  </div>
              </div>

              {/* Providers Section */}
              <div>
                <h3 className="text-xs font-black text-tertiary uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg">group</span>
                  Suppliers
                </h3>
                  <div className="flex gap-2 mb-4 bg-tertiary/5 p-2 rounded-2xl border border-dashed border-tertiary/20 group focus-within:border-tertiary/40 transition-all">
                    <input 
                      type="text"
                      placeholder="Add Supplier..."
                      value={newProviderInput}
                      onChange={(e) => setNewProviderInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddProvider()}
                      className="flex-grow bg-transparent border-none rounded-xl py-2.5 px-4 text-xs font-black text-on-surface focus:ring-0 placeholder:text-on-surface-variant/40"
                    />
                    <button 
                      onClick={handleAddProvider}
                      className="w-10 h-10 bg-tertiary/20 text-tertiary rounded-xl flex items-center justify-center hover:bg-tertiary/30 transition-all border border-tertiary/20"
                    >
                      <span className="material-symbols-outlined text-lg">add</span>
                    </button>
                  </div>
                  <div className="space-y-3">
                    {providers.map(provider => (
                      <div key={provider} className="flex items-center gap-3 group bg-slate-50 p-2 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                        <input 
                          type="text"
                          defaultValue={provider}
                          onBlur={(e) => handleEditProviderName(provider, e.target.value)}
                          className="flex-grow bg-transparent border-none rounded-xl py-2.5 px-4 text-xs font-black text-on-surface focus:ring-0 transition-all"
                        />
                        <button 
                          onClick={() => handleDeleteProvider(provider)}
                          className="w-10 h-10 flex items-center justify-center text-on-surface/10 group-hover:text-error transition-all"
                        >
                          <span className="material-symbols-outlined text-lg">delete_sweep</span>
                        </button>
                      </div>
                    ))}
                  </div>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-slate-200 flex justify-end">
              <button 
                onClick={() => setIsManageListsOpen(false)}
                className="bg-primary text-on-primary font-black px-10 py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-xs"
              >
                Close & Sync
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        {/* Mobile View */}
        <div className="md:hidden space-y-6">
          {accounts.map((acc) => (
            <div key={acc.id} className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200 shadow-xl relative overflow-hidden group hover:border-primary/20 transition-all">
               <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-500 ${acc.status === 'Available' ? 'bg-tertiary group-hover:w-2' : 'bg-error/50'}`}></div>
               
               <div className="flex justify-between items-start mb-6">
                 <div className="flex items-center gap-4">
                   <div>
                     <h3 className="font-black text-on-surface text-lg tracking-tight">{acc.service}</h3>
                     <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-[0.2em] opacity-40 mt-1">{acc.provider || 'Independiente'}</p>
                   </div>
                 </div>
                 <div className="text-right">
                    <p className="text-xl font-black text-on-surface tracking-tighter">${acc.price.toLocaleString()}</p>
                    <div className="flex justify-end mt-2">
                       <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border transition-all ${
                        acc.status === 'Available' ? 'bg-tertiary/20 text-tertiary border-tertiary/20' : 'bg-error/20 text-error border-error/20'
                      }`}>
                        {acc.status === 'Available' ? 'Disponible' : 'No Disponible'}
                      </span>
                    </div>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-6 py-6 border-y border-slate-200 mb-6 bg-white/5 rounded-2xl px-6">
                 <div>
                   <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] block mb-2 opacity-30">Identidad</span>
                   <p className="text-[11px] font-bold text-on-surface truncate opacity-90">{acc.email}</p>
                   <p className="text-[10px] text-primary font-black tracking-widest mt-1.5 uppercase">{acc.pass}</p>
                 </div>
                 <div className="text-right flex flex-col justify-center">
                   <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] block mb-1 opacity-30">Cupos</span>
                   <div className="flex items-center justify-end gap-2.5">
                     <span className="text-2xl font-black text-on-surface leading-none">{acc.uses}</span>
                     <span className={`w-2 h-2 rounded-full ${acc.uses > 0 ? 'bg-tertiary shadow-[0_0_8px_rgba(45,212,191,0.3)] animate-pulse' : 'bg-on-surface-variant/10'}`}></span>
                   </div>
                 </div>
               </div>

               <div className="flex gap-3">
                 <button 
                   onClick={() => onSale(acc)}
                   disabled={acc.uses <= 0}
                   className={`flex-grow flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all ${
                     acc.uses > 0 ? 'bg-primary text-on-primary shadow-lg shadow-primary/20 hover:scale-[1.02]' : 'bg-white/5 text-white/10 cursor-not-allowed border border-white/5'
                   }`}
                 >
                   <span className="material-symbols-outlined text-lg">shopping_bag</span>
                   Vender
                 </button>
                 <button 
                   onClick={() => handleEditAccount(acc)}
                   className="w-14 h-14 bg-white/5 flex items-center justify-center rounded-2xl text-on-surface-variant/40 hover:text-white hover:bg-white/10 border border-white/5 transition-all"
                 >
                   <span className="material-symbols-outlined text-xl">edit</span>
                 </button>
               </div>
            </div>
          ))}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block bg-surface rounded-[2.5rem] border border-outline-variant shadow-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary-bg border-b border-outline-variant text-center">
                <th className="px-6 py-6 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.25em] opacity-50">Plataforma</th>
                <th className="px-4 py-6 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.25em] opacity-50">Perfil</th>
                <th className="px-6 py-6 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.25em] opacity-50">Correo</th>
                <th className="px-6 py-6 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.25em] opacity-50 text-primary">Contraseña</th>
                <th className="px-6 py-6 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.25em] opacity-50">Precio Venta</th>
                <th className="px-6 py-6 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.25em] opacity-50">Costo</th>
                <th className="px-6 py-6 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.25em] opacity-50">Proveedor</th>
                <th className="px-6 py-6 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.25em] opacity-50">Cupos</th>
                <th className="px-6 py-6 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.25em] opacity-50">Estado</th>
                <th className="px-6 py-6 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.25em] opacity-50 text-right pr-12">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-body text-center">
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-white/5 transition-all group">
                   <td className="px-6 py-5">
                    <span className="font-black text-on-surface tracking-tight">{acc.service}</span>
                  </td>
                  <td className="px-4 py-5 font-black text-on-surface tracking-tight">#{acc.profile}</td>
                  <td className="px-6 py-5">
                    <p className="text-xs font-bold text-on-surface opacity-90">{acc.email}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-[11px] text-primary font-black tracking-widest uppercase">{acc.pass}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-black text-on-surface leading-none text-base tracking-tighter">${acc.price.toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-black text-on-surface-variant leading-none text-sm tracking-tighter opacity-60 group-hover:opacity-100 transition-opacity">${acc.cost?.toLocaleString() || 0}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest bg-secondary-bg px-3 py-1.5 rounded-lg border border-outline-variant">
                      {acc.provider || 'Directo'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3 justify-center">
                       <span className="text-base font-black text-on-surface leading-none">{acc.uses}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black tracking-[0.15em] border transition-colors ${
                      acc.status === 'Available' ? 'bg-tertiary/20 text-tertiary border-tertiary/20 shadow-[0_0_15px_rgba(45,212,191,0.1)]' : 'bg-error/20 text-error border-error/20'
                    }`}>
                      {acc.status === 'Available' ? 'DISPONIBLE' : 'AGOTADO'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right pr-12">
                    <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => onSale(acc)}
                        disabled={acc.uses <= 0}
                        className={`w-10 h-10 rounded-xl transition-all flex items-center justify-center border ${
                          acc.uses > 0 ? 'bg-primary text-on-primary border-primary/30 hover:scale-110 shadow-lg shadow-primary/20' : 'bg-white/5 text-white/5 border-white/5 cursor-not-allowed'
                        }`}
                        title="Vender"
                      >
                        <span className="material-symbols-outlined text-xl font-bold">shopping_cart</span>
                      </button>
                      <button 
                        onClick={() => handleEditAccount(acc)}
                        className="w-10 h-10 bg-white/5 border border-white/5 rounded-xl text-on-surface-variant/60 hover:text-white hover:bg-white/10 transition-all"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteAccount(acc.id)}
                        className="w-10 h-10 bg-error/10 border border-error/20 rounded-xl text-error hover:bg-error/20 transition-all font-bold"
                        title="Eliminar"
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {accounts.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center gap-4 bg-slate-50">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center border border-slate-200">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/20 font-thin">inventory</span>
              </div>
              <p className="text-on-surface font-black text-lg tracking-tight uppercase">Base de datos vacía</p>
            </div>
          )}
        </div>
      </div>
    </div>

  );
};

export default Inventory;
