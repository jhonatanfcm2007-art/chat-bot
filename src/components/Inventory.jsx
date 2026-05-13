import React, { useState, useRef } from 'react';

const PREDEFINED_PROFILES = ['1', '2', '3', '4', '5'];

const Inventory = ({ accounts, setAccounts, onSale, platforms, setPlatforms, providers, setProviders, salesHistory = [], onNavigateToChat, onMarkSaleAsSuccess, onMarkSaleAsFailed, chats = {}, onSendMessage }) => {
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [previewChatId, setPreviewChatId] = useState(null);
  
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

  const fileInputRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManageListsOpen, setIsManageListsOpen] = useState(false);
  const [showCustomPlatform, setShowCustomPlatform] = useState(false);
  const [showCustomProvider, setShowCustomProvider] = useState(false);
  const [showCustomProfile, setShowCustomProfile] = useState(false);

  const [newPlatformInput, setNewPlatformInput] = useState('');
  const [newProviderInput, setNewProviderInput] = useState('');

  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkRange, setBulkRange] = useState('1-7');

  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState({
    service: '',
    email: '',
    profile: '',
    pass: '',
    pin: '',
    price: '',
    cost: '',
    uses: '3',
    status: 'Available',
    provider: ''
  });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = text.split('\n').map(row => row.split(','));
      
      let startIndex = 0;
      if (rows.length > 0 && rows[0][0] && rows[0][0].toLowerCase().includes('plataforma')) {
        startIndex = 1;
      }
      
      let baseId = accounts.length > 0 ? Math.max(...accounts.map(a => a.id)) + 1 : 1;
      const newAccounts = [];
      const newPlatforms = new Set(platforms);
      const newProviders = new Set(providers);

      for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 4) continue;
        
        const service = row[0]?.trim();
        const profile = row[1]?.trim();
        const email = row[2]?.trim();
        const pass = row[3]?.trim();
        const pin = row[4]?.trim() || '';
        const price = parseInt(row[5]) || 0;
        const cost = parseInt(row[6]) || 0;
        const provider = row[7]?.trim() || '';
        const uses = parseInt(row[8]) || 3;

        if (!service || !email) continue;

        if (service) newPlatforms.add(service);
        if (provider) newProviders.add(provider);

        newAccounts.push({
          id: baseId++,
          service,
          profile,
          email,
          pass,
          pin,
          price,
          cost,
          provider,
          uses,
          status: uses > 0 ? 'Available' : 'Sold',
          originalUses: uses
        });
      }

      if (newAccounts.length > 0) {
        setAccounts(prev => [...newAccounts, ...prev]);
        setPlatforms(Array.from(newPlatforms));
        setProviders(Array.from(newProviders));
        alert(`¡Se importaron ${newAccounts.length} cuentas con éxito!`);
      }
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddAccount = (e) => {
    e.preventDefault();
    const serviceName = formData.service.trim();
    if (!serviceName || !formData.email || !formData.pass) return;

    const usesCount = parseInt(formData.uses) || 0;
    
    if (serviceName) {
      setPlatforms(prev => prev.includes(serviceName) ? prev : [...prev, serviceName]);
    }

    if (formData.provider) {
      setProviders(prev => prev.includes(formData.provider) ? prev : [...prev, formData.provider]);
    }

    if (editingAccount) {
      setAccounts(prev => prev.map(acc => 
        acc.id === editingAccount.id ? { 
          ...acc, 
          ...formData, 
          service: serviceName,
          price: parseInt(formData.price) || 0, 
          cost: parseInt(formData.cost) || 0, 
          uses: usesCount,
          status: usesCount > 0 ? 'Available' : 'Sold'
        } : acc
      ));
    } else if (isBulkMode) {
      const rangeMatch = bulkRange.match(/(\d+)-(\d+)/);
      if (!rangeMatch) {
         alert('Por favor usa formato de rango válido (ej: 1-7)');
         return;
      }
      const start = parseInt(rangeMatch[1]);
      const end = parseInt(rangeMatch[2]);
      const totalProfiles = end - start + 1;
      
      const totalPrice = parseInt(formData.price) || 0;
      const totalCost = parseInt(formData.cost) || 0;
      const costPerProfile = totalCost / totalProfiles;

      const newAccounts = [];
      let baseId = accounts.length > 0 ? Math.max(...accounts.map(a => a.id)) + 1 : 1;

      for (let i = start; i <= end; i++) {
        newAccounts.push({
          id: baseId++,
          ...formData,
          service: serviceName,
          profile: i.toString(),
          uses: usesCount,
          status: usesCount > 0 ? 'Available' : 'Sold',
          price: totalPrice,
          cost: costPerProfile,
          originalUses: usesCount
        });
      }
      setAccounts(prev => [...newAccounts, ...prev]);
    } else {
      const newAcc = {
        id: accounts.length > 0 ? Math.max(...accounts.map(a => a.id)) + 1 : 1,
        ...formData,
        service: serviceName,
        status: usesCount > 0 ? 'Available' : 'Sold',
        uses: usesCount,
        price: parseInt(formData.price) || 0,
        cost: parseInt(formData.cost) || 0,
        originalUses: usesCount
      };
      setAccounts(prev => [newAcc, ...prev]);
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
      pin: account.pin || '',
      price: account.price,
      cost: account.cost || '',
      uses: account.uses.toString(),
      status: account.status,
      provider: account.provider || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteAccount = (id) => {
    setAccounts(accounts.filter(acc => acc.id !== id));
  };

  const handleCopyAccount = (acc) => {
    const data = `Plataforma: ${acc.service}\nPerfil: ${acc.profile}\nCorreo: ${acc.email}\nContraseña: ${acc.pass}${acc.pin ? '\nPIN: ' + acc.pin : ''}`;
    navigator.clipboard.writeText(data).then(() => {
      alert('¡Información de la cuenta copiada!');
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsManageListsOpen(false);
    setShowCustomPlatform(false);
    setShowCustomProvider(false);
    setShowCustomProfile(false);
    setEditingAccount(null);
    setIsBulkMode(false);
    setFormData({ service: '', email: '', profile: '', pass: '', pin: '', price: '', cost: '', uses: '3', status: 'Available', provider: '' });
    setHistoryModalOpen(false);
    setSelectedHistory(null);
  };

  const handleShowHistory = (acc) => {
    const accountHistory = salesHistory.filter(sale => 
      sale.email?.toLowerCase() === acc.email?.toLowerCase() && 
      sale.profile?.toString() === acc.profile?.toString() &&
      sale.service?.toLowerCase() === acc.service?.toLowerCase()
    );
    setSelectedHistory({
      account: acc,
      history: accountHistory
    });
    setHistoryModalOpen(true);
  };

  const handleEditPlatformName = (oldName, newName) => {
    if (!newName.trim() || oldName === newName) return;
    setPlatforms(prev => prev.map(p => p === oldName ? newName : p));
    setAccounts(prev => prev.map(acc => acc.service === oldName ? { ...acc, service: newName } : acc));
  };

  const handleDeletePlatform = (name) => {
    setPlatforms(prev => prev.filter(p => p !== name));
  };

  const handleEditProviderName = (oldName, newName) => {
    if (!newName.trim() || oldName === newName) return;
    setProviders(prev => prev.map(p => p === oldName ? newName : p));
    setAccounts(prev => prev.map(acc => acc.provider === oldName ? { ...acc, provider: newName } : acc));
  };

  const handleDeleteProvider = (name) => {
    setProviders(prev => prev.filter(p => p !== name));
  };

  const handleAddPlatform = () => {
    const trimmed = newPlatformInput.trim();
    if (trimmed) {
      setPlatforms(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
      setNewPlatformInput('');
    }
  };

  const handleAddProvider = () => {
    const trimmed = newProviderInput.trim();
    if (trimmed) {
      setProviders(prev => prev.includes(trimmed) ? prev : [...prev, trimmed]);
      setNewProviderInput('');
    }
  };

  const statsByService = accounts
    .filter(a => a.status === 'Available' && (parseInt(a.uses) || 0) > 0)
    .reduce((acc, curr) => {
      const normalizedName = curr.service.trim().toLowerCase();
      if (!acc[normalizedName]) {
        acc[normalizedName] = { displayName: curr.service.trim(), totalSlots: 0 };
      }
      acc[normalizedName].totalSlots += (parseInt(curr.uses) || 0);
      return acc;
    }, {});

  const [expandedGroups, setExpandedGroups] = useState([]);
  const [expandedEmails, setExpandedEmails] = useState([]);
  
  const toggleGroup = (platform) => {
    setExpandedGroups(prev => prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]);
  };

  const toggleEmail = (emailKey) => {
    setExpandedEmails(prev => prev.includes(emailKey) ? prev.filter(e => e !== emailKey) : [...prev, emailKey]);
  };

  const groupedAccounts = accounts.reduce((acc, curr) => {
    const platform = curr.service || 'Otros';
    const email = curr.email || 'Sin Correo';
    if (!acc[platform]) acc[platform] = {};
    if (!acc[platform][email]) acc[platform][email] = [];
    acc[platform][email].push(curr);
    return acc;
  }, {});

  return (
    <div className="flex-grow p-4 md:p-8 bg-background overflow-y-auto custom-scrollbar relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <h1 className="text-3xl font-black text-on-surface tracking-tighter uppercase">Gestor de Inventario</h1>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="glass flex items-center justify-center gap-2 px-6 py-3 rounded-2xl hover:bg-black/5 border border-slate-200">
            <span className="material-symbols-outlined text-xl text-emerald-500 font-bold">upload_file</span>
            <span className="font-bold text-on-surface">Importar CSV</span>
          </button>
          <button onClick={() => setIsManageListsOpen(true)} className="glass flex items-center justify-center gap-3 px-6 py-3 rounded-2xl hover:bg-black/5">
            <span className="material-symbols-outlined text-xl text-primary font-bold">tune</span>
            <span className="font-bold text-on-surface">Listas</span>
          </button>
          <button onClick={() => { closeModal(); setIsModalOpen(true); }} className="bg-primary text-on-primary font-black px-8 py-3 rounded-2xl shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
            <span className="material-symbols-outlined text-xl">add_circle</span>
            Agregar Cuenta
          </button>
        </div>
      </div>

      <div className="mb-10 w-full overflow-hidden">
        <div className="bg-white border-2 border-slate-200 rounded-[2rem] flex items-center h-14 md:h-16 overflow-hidden shadow-sm">
          <div className="bg-slate-50 h-full flex items-center px-6 border-r-2 border-slate-200 flex-shrink-0">
            <h2 className="text-on-surface font-black text-xs tracking-[0.2em] uppercase">Stock</h2>
          </div>
          <div className="flex-grow h-full flex gap-4 items-center px-6 overflow-x-auto custom-scrollbar">
            {Object.entries(statsByService).map(([key, data]) => (
              <div key={key} className="flex items-center gap-2 flex-shrink-0 bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-1">
                <span className="text-[10px] font-black text-slate-400 uppercase">{data.displayName}</span>
                <span className="text-sm font-black text-on-surface">{data.totalSlots}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden mb-10">
        <div className="overflow-x-auto custom-scrollbar hidden md:block">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase">Servicio / Email</th>
                <th className="px-4 py-5 text-[11px] font-black text-slate-400 uppercase">Perfil</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase">Contraseña</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase">PIN</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase">Precio</th>
                <th className="px-6 py-5 text-[11px] font-black text-tertiary uppercase">Éxito</th>
                <th className="px-6 py-5 text-[11px] font-black text-error uppercase">Falla</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase">Prov.</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase">Cupos</th>
                <th className="px-6 py-5 text-[11px] font-black text-slate-400 uppercase">Estado</th>
                <th className="px-6 py-5 text-right pr-12 text-[11px] font-black text-slate-400 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(groupedAccounts).map(([platform, emailsGroup]) => {
                const isExpanded = expandedGroups.includes(platform);
                const allAccountsInPlatform = Object.values(emailsGroup).flat();
                const totalSlots = allAccountsInPlatform.reduce((sum, acc) => sum + (parseInt(acc.uses) || 0), 0);
                return (
                  <React.Fragment key={platform}>
                    <tr className={`cursor-pointer ${isExpanded ? 'bg-primary/5' : 'hover:bg-slate-50'}`} onClick={() => toggleGroup(platform)}>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <span className={`material-symbols-outlined transition-all ${isExpanded ? 'rotate-90' : ''}`}>chevron_right</span>
                          <span className="font-black text-slate-800 text-xs uppercase">{platform} ({allAccountsInPlatform.length})</span>
                        </div>
                      </td>
                      <td colSpan="7" className="px-4 py-5 italic text-[10px] text-slate-400 text-center">Resumen</td>
                      <td className="px-6 py-5"><span className="font-black text-primary">{totalSlots}</span></td>
                      <td className="px-6 py-5"><span className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${totalSlots > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>{totalSlots > 0 ? 'STOCK' : 'AGOTADO'}</span></td>
                      <td className="px-6 py-5 text-right pr-12"><span className="text-[10px] font-black text-slate-300 uppercase">{isExpanded ? 'Cerrar' : 'Ver'}</span></td>
                    </tr>
                    {isExpanded && Object.entries(emailsGroup).map(([email, emailAccounts]) => {
                      const emailKey = `${platform}-${email}`;
                      const isEmailExpanded = expandedEmails.includes(emailKey);
                      const emailSlots = emailAccounts.reduce((sum, acc) => sum + (parseInt(acc.uses) || 0), 0);
                      return (
                        <React.Fragment key={emailKey}>
                          <tr className={`bg-slate-50/50 cursor-pointer border-l-4 ${isEmailExpanded ? 'border-primary' : 'border-slate-200'}`} onClick={() => toggleEmail(emailKey)}>
                            <td className="px-6 py-4 pl-12 text-xs font-bold text-slate-500 truncate">{email}</td>
                            <td colSpan="7"></td>
                            <td className="px-6 py-4"><span className="text-xs font-black bg-white px-2 py-1 rounded border shadow-sm">{emailSlots}</span></td>
                            <td colSpan="2" className="px-6 py-4 text-right pr-12"><span className="text-[10px] font-black text-primary/40 uppercase">{isEmailExpanded ? 'Ocultar' : 'Perfiles'}</span></td>
                          </tr>
                          {isEmailExpanded && emailAccounts.map(acc => (
                            <tr key={acc.id} className="bg-white hover:bg-slate-50 border-l-4 border-slate-100">
                              <td className="px-6 py-4 pl-20 text-[10px] font-bold text-slate-400 uppercase">{acc.service}</td>
                              <td className="px-4 py-4 font-black text-slate-600">#{acc.profile}</td>
                              <td className="px-6 py-4 text-[11px] text-primary font-bold tracking-widest">{acc.pass}</td>
                              <td className="px-6 py-4 text-[11px] text-slate-500 font-bold">{acc.pin || '-'}</td>
                              <td className="px-6 py-4 font-black text-slate-800">${acc.price?.toLocaleString()}</td>
                              <td className="px-6 py-4 font-black text-xs text-tertiary">{acc.exitosas || 0}</td>
                              <td className="px-6 py-4 font-black text-xs text-error">{acc.failed || 0}</td>
                              <td className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded">{acc.provider || 'Directo'}</td>
                              <td className="px-6 py-4 font-black text-primary">{acc.uses}</td>
                              <td className="px-6 py-4"><span className={`text-[8px] font-black uppercase px-2 py-1 rounded ${acc.status === 'Available' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{acc.status === 'Available' ? 'Ok' : 'Sold'}</span></td>
                              <td className="px-6 py-4 text-right pr-4">
                                <div className="flex justify-end gap-1">
                                  <button onClick={() => handleShowHistory(acc)} className="p-1.5 text-slate-400 hover:text-primary transition-all"><span className="material-symbols-outlined text-lg">history</span></button>
                                  <button onClick={() => handleEditAccount(acc)} className="p-1.5 text-slate-400 hover:text-primary transition-all"><span className="material-symbols-outlined text-lg">edit</span></button>
                                  <button onClick={() => onSale(acc)} disabled={parseInt(acc.uses) <= 0} className={`p-1.5 rounded-lg ${parseInt(acc.uses) > 0 ? 'text-primary' : 'text-slate-200'}`}><span className="material-symbols-outlined text-lg">sell</span></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-slate-100">
          {Object.entries(groupedAccounts).map(([platform, emailsGroup]) => {
            const isExpanded = expandedGroups.includes(platform);
            const allAccountsInPlatform = Object.values(emailsGroup).flat();
            const totalSlots = allAccountsInPlatform.reduce((sum, acc) => sum + (parseInt(acc.uses) || 0), 0);
            return (
              <div key={platform}>
                <div className={`p-5 flex items-center justify-between ${isExpanded ? 'bg-primary/5' : ''}`} onClick={() => toggleGroup(platform)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><span className="material-symbols-outlined">dataset</span></div>
                    <div>
                      <h3 className="font-black text-slate-800 uppercase text-xs">{platform}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{totalSlots} cupos</p>
                    </div>
                  </div>
                  <span className={`material-symbols-outlined text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                </div>
                {isExpanded && (
                  <div className="divide-y divide-slate-50 bg-slate-50/50">
                    {Object.entries(emailsGroup).map(([email, emailAccounts]) => {
                      const emailKey = `${platform}-${email}`;
                      const isEmailExpanded = expandedEmails.includes(emailKey);
                      const emailSlots = emailAccounts.reduce((sum, acc) => sum + (parseInt(acc.uses) || 0), 0);
                      return (
                        <div key={emailKey}>
                          <div className="p-4 pl-8 flex items-center justify-between" onClick={() => toggleEmail(emailKey)}>
                            <span className="text-[10px] font-bold text-slate-500 truncate max-w-[200px]">{email}</span>
                            <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded border">{emailSlots}</span>
                          </div>
                          {isEmailExpanded && (
                            <div className="p-3 space-y-3 bg-white">
                              {emailAccounts.map(acc => (
                                <div key={acc.id} className="p-5 rounded-[2rem] border border-slate-100 bg-slate-50/50">
                                  <div className="flex justify-between items-start mb-4">
                                    <div>
                                      <span className="text-[9px] font-black text-slate-400 uppercase">Perfil #{acc.profile}</span>
                                      <h4 className="text-sm font-black text-slate-800">${acc.price?.toLocaleString()}</h4>
                                    </div>
                                    <span className={`text-[8px] font-black px-2 py-1 rounded-lg border ${parseInt(acc.uses) > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{parseInt(acc.uses) > 0 ? `${acc.uses} DISP.` : 'OFF'}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-white p-3 rounded-2xl border border-slate-100" onClick={() => { navigator.clipboard.writeText(acc.pass); alert('¡Clave copiada!'); }}>
                                      <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Pass</span>
                                      <span className="text-[10px] font-bold text-primary block truncate">{acc.pass}</span>
                                    </div>
                                    <div className="bg-white p-3 rounded-2xl border border-slate-100" onClick={() => { if(acc.pin) { navigator.clipboard.writeText(acc.pin); alert('¡PIN copiado!'); } }}>
                                      <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">PIN</span>
                                      <span className="text-[10px] font-bold text-slate-600 block">{acc.pin || '-'}</span>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                    <div className="flex gap-4">
                                      <div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase">Ventas</span><span className="text-[11px] font-black text-tertiary">{acc.exitosas || 0}</span></div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button onClick={() => handleShowHistory(acc)} className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center"><span className="material-symbols-outlined text-lg">history</span></button>
                                      <button onClick={() => handleEditAccount(acc)} className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center"><span className="material-symbols-outlined text-lg">edit</span></button>
                                      <button onClick={() => onSale(acc)} disabled={parseInt(acc.uses) <= 0} className={`w-9 h-9 rounded-xl flex items-center justify-center ${parseInt(acc.uses) > 0 ? 'bg-primary text-white' : 'bg-slate-200 text-white'}`}><span className="material-symbols-outlined text-lg">sell</span></button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border p-8 flex flex-col max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase">{editingAccount ? 'Editar Cuenta' : 'Agregar Cuenta'}</h2>
              <button onClick={closeModal}><span className="material-symbols-outlined">close</span></button>
            </div>
            {!editingAccount && (
              <div className="flex items-center gap-4 mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isBulkMode} onChange={(e) => setIsBulkMode(e.target.checked)} className="w-4 h-4 accent-primary" />
                  <span className="text-xs font-bold text-slate-500">Modo Masivo</span>
                </label>
                {isBulkMode && (
                  <input type="text" value={bulkRange} onChange={(e) => setBulkRange(e.target.value)} placeholder="1-7" className="bg-slate-50 border p-2 rounded-xl text-xs w-20 text-center font-bold" />
                )}
              </div>
            )}
            <form onSubmit={handleAddAccount} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Plataforma</label>
                {showCustomPlatform ? (
                  <input type="text" name="service" value={formData.service} onChange={handleInputChange} placeholder="Nombre..." className="w-full bg-slate-50 border p-3 rounded-xl text-sm" required />
                ) : (
                  <div className="flex gap-2">
                    <select name="service" value={formData.service} onChange={(e) => { if (e.target.value === '__custom__') { setShowCustomPlatform(true); setFormData(p => ({...p, service: ''})); } else { handleInputChange(e); }}} className="flex-grow bg-slate-50 border p-3 rounded-xl text-sm" required>
                      <option value="">Seleccionar...</option>
                      {availablePlatforms.map(p => <option key={p} value={p}>{p}</option>)}
                      <option value="__custom__">+ Otra</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Correo</label>
                <input type="text" name="email" value={formData.email} onChange={handleInputChange} placeholder="correo@ejemplo.com" className="w-full bg-slate-50 border p-3 rounded-xl text-sm" required />
              </div>
              {!isBulkMode && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Perfil</label>
                  {showCustomProfile ? (
                    <input type="text" name="profile" value={formData.profile} onChange={handleInputChange} placeholder="#" className="w-full bg-slate-50 border p-3 rounded-xl text-sm" />
                  ) : (
                    <select name="profile" value={formData.profile} onChange={(e) => { if (e.target.value === '__custom__') { setShowCustomProfile(true); setFormData(p => ({...p, profile: ''})); } else { handleInputChange(e); }}} className="w-full bg-slate-50 border p-3 rounded-xl text-sm">
                      <option value="">Seleccionar...</option>
                      {availableProfiles.map(p => <option key={p} value={p}>{p}</option>)}
                      <option value="__custom__">+ Otro</option>
                    </select>
                  )}
                </div>
              )}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Contraseña</label>
                <input type="text" name="pass" value={formData.pass} onChange={handleInputChange} placeholder="****" className="w-full bg-slate-50 border p-3 rounded-xl text-sm" required />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">PIN</label>
                <input type="text" name="pin" value={formData.pin} onChange={handleInputChange} placeholder="Opcional" className="w-full bg-slate-50 border p-3 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Precio</label>
                <input type="number" name="price" value={formData.price} onChange={handleInputChange} placeholder="$" className="w-full bg-slate-50 border p-3 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Costo</label>
                <input type="number" name="cost" value={formData.cost} onChange={handleInputChange} placeholder="$" className="w-full bg-slate-50 border p-3 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Cupos</label>
                <input type="number" name="uses" value={formData.uses} onChange={handleInputChange} className="w-full bg-slate-50 border p-3 rounded-xl text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Proveedor</label>
                {showCustomProvider ? (
                  <input type="text" name="provider" value={formData.provider} onChange={handleInputChange} placeholder="Nombre..." className="w-full bg-slate-50 border p-3 rounded-xl text-sm" />
                ) : (
                  <select name="provider" value={formData.provider} onChange={(e) => { if (e.target.value === '__custom__') { setShowCustomProvider(true); setFormData(p => ({...p, provider: ''})); } else { handleInputChange(e); }}} className="w-full bg-slate-50 border p-3 rounded-xl text-sm">
                    <option value="">Seleccionar...</option>
                    {availableProviders.map(p => <option key={p} value={p}>{p}</option>)}
                    <option value="__custom__">+ Otro</option>
                  </select>
                )}
              </div>
              <div className="md:col-span-2 mt-4 flex gap-3">
                <button type="submit" className="flex-grow bg-primary text-white font-black py-4 rounded-2xl uppercase text-xs">
                  {editingAccount ? 'Guardar Cambios' : (isBulkMode ? `Crear Perfiles ${bulkRange}` : 'Agregar Cuenta')}
                </button>
                {editingAccount && (
                  <button type="button" onClick={() => { handleDeleteAccount(editingAccount.id); closeModal(); }} className="bg-rose-500 text-white font-black py-4 px-6 rounded-2xl uppercase text-xs">Eliminar</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {isManageListsOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border p-8 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase">Master Config</h2>
              <button onClick={() => setIsManageListsOpen(false)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto p-2">
              <div>
                <h3 className="text-xs font-black text-primary uppercase mb-4">Platforms</h3>
                <div className="flex gap-2 mb-4">
                  <input type="text" placeholder="Add..." value={newPlatformInput} onChange={(e) => setNewPlatformInput(e.target.value)} className="flex-grow bg-slate-50 border p-2 rounded-xl text-xs" />
                  <button onClick={handleAddPlatform} className="bg-primary/20 text-primary p-2 rounded-xl"><span className="material-symbols-outlined">add</span></button>
                </div>
                <div className="space-y-2">
                  {platforms.map(p => (
                    <div key={p} className="flex justify-between bg-slate-50 p-2 rounded-xl text-[10px] font-bold">
                      <span>{p}</span>
                      <button onClick={() => handleDeletePlatform(p)} className="text-error opacity-20 hover:opacity-100"><span className="material-symbols-outlined text-sm">delete</span></button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-black text-tertiary uppercase mb-4">Suppliers</h3>
                <div className="flex gap-2 mb-4">
                  <input type="text" placeholder="Add..." value={newProviderInput} onChange={(e) => setNewProviderInput(e.target.value)} className="flex-grow bg-slate-50 border p-2 rounded-xl text-xs" />
                  <button onClick={handleAddProvider} className="bg-tertiary/20 text-tertiary p-2 rounded-xl"><span className="material-symbols-outlined">add</span></button>
                </div>
                <div className="space-y-2">
                  {providers.map(p => (
                    <div key={p} className="flex justify-between bg-slate-50 p-2 rounded-xl text-[10px] font-bold">
                      <span>{p}</span>
                      <button onClick={() => handleDeleteProvider(p)} className="text-error opacity-20 hover:opacity-100"><span className="material-symbols-outlined text-sm">delete</span></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setIsManageListsOpen(false)} className="bg-primary text-white font-black py-4 rounded-2xl mt-8 uppercase text-xs">Cerrar</button>
          </div>
        </div>
      )}

      {historyModalOpen && selectedHistory && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-black uppercase">Historial de Entrega</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{selectedHistory.account.service} - Perfil #{selectedHistory.account.profile}</p>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="flex-grow overflow-y-auto space-y-4 pr-2">
              {selectedHistory.history.length > 0 ? (
                selectedHistory.history.map((sale, idx) => (
                  <div key={idx} className="bg-slate-50 border rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-black text-slate-700">{sale.customer || 'Venta Directa'}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(sale.id).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => onMarkSaleAsSuccess(sale.id, selectedHistory.account.id)} className="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center border border-emerald-100"><span className="material-symbols-outlined text-lg">check</span></button>
                      <button onClick={() => { if(window.confirm('¿Marcar como FALLIDA?')) onMarkSaleAsFailed(sale.id, selectedHistory.account.id); }} className="w-8 h-8 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center border border-rose-100"><span className="material-symbols-outlined text-lg">block</span></button>
                      {(sale.customerId || Object.values(chats).find(c => c.customerName === sale.customer)?.from) && (
                        <button onClick={() => setPreviewChatId(sale.customerId || Object.values(chats).find(c => c.customerName === sale.customer)?.from)} className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center border border-primary/20"><span className="material-symbols-outlined text-lg">visibility</span></button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-40 flex flex-col items-center justify-center opacity-20">
                  <span className="material-symbols-outlined text-4xl">history</span>
                  <p className="text-[10px] font-black uppercase">Sin registros</p>
                </div>
              )}
            </div>
            <button onClick={() => setHistoryModalOpen(false)} className="bg-primary text-white font-black py-4 rounded-2xl mt-8 uppercase text-xs">Cerrar</button>
          </div>
        </div>
      )}

      {previewChatId && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] flex flex-col max-h-[80vh] overflow-hidden">
            <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="font-black uppercase text-sm tracking-widest">Vista Previa Chat</h3>
              <button onClick={() => setPreviewChatId(null)}><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-slate-50/50 custom-scrollbar">
              {chats[previewChatId]?.messages?.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl text-[11px] font-bold shadow-sm ${m.role === 'user' ? 'bg-white text-slate-700' : 'bg-primary text-white'}`}>
                    {m.imageUrl ? <img src={m.imageUrl} alt="img" className="rounded-lg mb-2 max-h-40" /> : <p>{m.content}</p>}
                    <p className="text-[8px] mt-1 opacity-40 uppercase">{new Date(m.timestampRaw || Date.now()).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 bg-white border-t flex gap-3">
               <button onClick={() => { onSendMessage({ to: previewChatId, content: '⚠️ *Recordatorio:* Pendiente tu pago. Quedo atento. 🙏' }); alert('Enviado'); }} className="flex-grow bg-emerald-500 text-white font-black py-4 rounded-2xl uppercase text-[10px]">Recordatorio</button>
               <button onClick={() => setPreviewChatId(null)} className="px-6 bg-slate-900 text-white font-black py-4 rounded-2xl uppercase text-[10px]">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
