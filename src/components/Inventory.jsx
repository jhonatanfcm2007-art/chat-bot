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
    if (!serviceName) return;

    const usesCount = parseInt(formData.uses) || 0;
    const finalEmail = formData.email?.trim() || 'N/A';
    const finalPass = formData.pass?.trim() || 'N/A';
    
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
          email: finalEmail,
          pass: finalPass,
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
          email: finalEmail,
          pass: finalPass,
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
        email: finalEmail,
        pass: finalPass,
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <h1 className="text-lg font-semibold text-on-surface">Gestor de Inventario</h1>
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-100 border border-slate-200 bg-white transition-colors">
            <span className="material-symbols-outlined text-lg text-emerald-500">upload_file</span>
            <span className="font-medium text-sm text-on-surface">Importar CSV</span>
          </button>
          <button onClick={() => setIsManageListsOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-100 border border-slate-200 bg-white transition-colors">
            <span className="material-symbols-outlined text-lg text-primary">tune</span>
            <span className="font-medium text-sm text-on-surface">Listas</span>
          </button>
          <button onClick={() => { closeModal(); setIsModalOpen(true); }} className="bg-primary text-white font-medium px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-lg">add_circle</span>
            Agregar Cuenta
          </button>
        </div>
      </div>

      <div className="mb-8 w-full overflow-hidden">
        <div className="bg-white border border-slate-200 rounded-xl flex items-center h-12 md:h-14 overflow-hidden shadow-sm">
          <div className="bg-slate-50 h-full flex items-center px-5 border-r border-slate-200 flex-shrink-0">
            <h2 className="text-xs font-medium text-slate-400">Stock</h2>
          </div>
          <div className="flex-grow h-full flex gap-3 items-center px-5 overflow-x-auto custom-scrollbar">
            {Object.entries(statsByService).map(([key, data]) => (
              <div key={key} className="flex items-center gap-2 flex-shrink-0 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1">
                <span className="text-xs font-medium text-slate-400">{data.displayName}</span>
                <span className="text-sm font-semibold text-on-surface">{data.totalSlots}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto custom-scrollbar hidden md:block">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-medium text-slate-400">Producto / Presentación</th>
                <th className="px-4 py-4 text-xs font-medium text-slate-400">Variante</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400">Detalles Envío</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400">Promoción</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400">Precio (Q)</th>
                <th className="px-6 py-4 text-xs font-medium text-tertiary">Éxito</th>
                <th className="px-6 py-4 text-xs font-medium text-error">Falla</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400">Prov.</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400">Cupos</th>
                <th className="px-6 py-4 text-xs font-medium text-slate-400">Estado</th>
                <th className="px-6 py-4 text-right pr-12 text-xs font-medium text-slate-400">Acciones</th>
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
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className={`material-symbols-outlined transition-all ${isExpanded ? 'rotate-90' : ''}`}>chevron_right</span>
                          <span className="font-semibold text-slate-800 text-sm">{platform} ({allAccountsInPlatform.length})</span>
                        </div>
                      </td>
                      <td colSpan="7" className="px-4 py-4 text-xs text-slate-400 text-center italic">Resumen</td>
                      <td className="px-6 py-4"><span className="font-semibold text-primary">{totalSlots}</span></td>
                      <td className="px-6 py-4"><span className={`text-xs font-medium px-2 py-0.5 rounded-md ${totalSlots > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{totalSlots > 0 ? 'Stock' : 'Agotado'}</span></td>
                      <td className="px-6 py-4 text-right pr-12"><span className="text-xs font-medium text-slate-400">{isExpanded ? 'Cerrar' : 'Ver'}</span></td>
                    </tr>
                    {isExpanded && Object.entries(emailsGroup).map(([email, emailAccounts]) => {
                      const emailKey = `${platform}-${email}`;
                      const isEmailExpanded = expandedEmails.includes(emailKey);
                      const emailSlots = emailAccounts.reduce((sum, acc) => sum + (parseInt(acc.uses) || 0), 0);
                      return (
                        <React.Fragment key={emailKey}>
                          <tr className={`bg-slate-50/50 cursor-pointer border-l-4 ${isEmailExpanded ? 'border-primary' : 'border-slate-200'}`} onClick={() => toggleEmail(emailKey)}>
                            <td className="px-6 py-3 pl-12 text-xs font-medium text-slate-500 truncate">{email}</td>
                            <td colSpan="7"></td>
                            <td className="px-6 py-3"><span className="text-xs font-semibold bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-sm">{emailSlots}</span></td>
                            <td colSpan="2" className="px-6 py-3 text-right pr-12"><span className="text-xs font-medium text-primary/50">{isEmailExpanded ? 'Ocultar' : 'Perfiles'}</span></td>
                          </tr>
                          {isEmailExpanded && emailAccounts.map(acc => (
                            <tr key={acc.id} className="bg-white hover:bg-slate-50 border-l-4 border-slate-100">
                              <td className="px-6 py-3 pl-20 text-xs font-medium text-slate-400">{acc.service}</td>
                              <td className="px-4 py-3 font-semibold text-slate-600">#{acc.profile}</td>
                              <td className="px-6 py-3 text-xs text-primary font-medium">{acc.pass}</td>
                              <td className="px-6 py-3 text-xs text-slate-500 font-medium">{acc.pin || '-'}</td>
                              <td className="px-6 py-3 font-semibold text-slate-800">${acc.price?.toLocaleString()}</td>
                              <td className="px-6 py-3 font-semibold text-xs text-tertiary">{acc.exitosas || 0}</td>
                              <td className="px-6 py-3 font-semibold text-xs text-error">{acc.failed || 0}</td>
                              <td className="px-6 py-3 text-xs font-medium text-slate-400">{acc.provider || 'Directo'}</td>
                              <td className="px-6 py-3 font-semibold text-primary">{acc.uses}</td>
                              <td className="px-6 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-md ${acc.status === 'Available' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{acc.status === 'Available' ? 'Ok' : 'Sold'}</span></td>
                              <td className="px-6 py-3 text-right pr-4">
                                <div className="flex justify-end gap-1">
                                  <button onClick={() => handleShowHistory(acc)} className="p-1.5 text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined text-lg">history</span></button>
                                  <button onClick={() => handleEditAccount(acc)} className="p-1.5 text-slate-400 hover:text-primary transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
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
                <div className={`p-4 flex items-center justify-between ${isExpanded ? 'bg-primary/5' : ''}`} onClick={() => toggleGroup(platform)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><span className="material-symbols-outlined">dataset</span></div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">{platform}</h3>
                      <p className="text-xs font-medium text-slate-400">{totalSlots} cupos</p>
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
                            <span className="text-xs font-medium text-slate-500 truncate max-w-[200px]">{email}</span>
                            <span className="text-xs font-semibold bg-white px-2 py-0.5 rounded-md border border-slate-200">{emailSlots}</span>
                          </div>
                          {isEmailExpanded && (
                            <div className="p-3 space-y-3 bg-white">
                              {emailAccounts.map(acc => (
                                <div key={acc.id} className="p-4 rounded-xl border border-slate-200/60 bg-slate-50/50">
                                  <div className="flex justify-between items-start mb-3">
                                    <div>
                                      <span className="text-xs font-medium text-slate-400">Perfil #{acc.profile}</span>
                                      <h4 className="text-sm font-semibold text-slate-800">${acc.price?.toLocaleString()}</h4>
                                    </div>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${parseInt(acc.uses) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{parseInt(acc.uses) > 0 ? `${acc.uses} disp.` : 'Off'}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="bg-white p-3 rounded-lg border border-slate-200/60" onClick={() => { navigator.clipboard.writeText(acc.pass); alert('¡Clave copiada!'); }}>
                                      <span className="text-xs font-medium text-slate-400 block mb-1">Pass</span>
                                      <span className="text-xs font-medium text-primary block truncate">{acc.pass}</span>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-slate-200/60" onClick={() => { if(acc.pin) { navigator.clipboard.writeText(acc.pin); alert('¡PIN copiado!'); } }}>
                                      <span className="text-xs font-medium text-slate-400 block mb-1">PIN</span>
                                      <span className="text-xs font-medium text-slate-600 block">{acc.pin || '-'}</span>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                    <div className="flex gap-4">
                                      <div className="flex flex-col"><span className="text-xs font-medium text-slate-400">Ventas</span><span className="text-xs font-semibold text-tertiary">{acc.exitosas || 0}</span></div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button onClick={() => handleShowHistory(acc)} className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center"><span className="material-symbols-outlined text-lg">history</span></button>
                                      <button onClick={() => handleEditAccount(acc)} className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center"><span className="material-symbols-outlined text-lg">edit</span></button>
                                      <button onClick={() => onSale(acc)} disabled={parseInt(acc.uses) <= 0} className={`w-9 h-9 rounded-lg flex items-center justify-center ${parseInt(acc.uses) > 0 ? 'bg-primary text-white' : 'bg-slate-200 text-white'}`}><span className="material-symbols-outlined text-lg">sell</span></button>
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
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 p-6 md:p-8 flex flex-col max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base font-semibold text-on-surface">{editingAccount ? 'Editar Producto / Combo' : 'Agregar Producto'}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>
            {!editingAccount && (
              <div className="flex items-center gap-4 mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isBulkMode} onChange={(e) => setIsBulkMode(e.target.checked)} className="w-4 h-4 accent-primary" />
                  <span className="text-xs font-medium text-slate-500">Modo Masivo</span>
                </label>
                {isBulkMode && (
                  <input type="text" value={bulkRange} onChange={(e) => setBulkRange(e.target.value)} placeholder="1-7" className="bg-white border border-slate-200 p-2 rounded-lg text-xs w-20 text-center font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                )}
              </div>
            )}
            <form onSubmit={handleAddAccount} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">Producto / Combo</label>
                {showCustomPlatform ? (
                  <input type="text" name="service" value={formData.service} onChange={handleInputChange} placeholder="Ej: Shilajit Resina 30g..." className="w-full bg-white border border-slate-200 p-3 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" required />
                ) : (
                  <div className="flex gap-2">
                    <select name="service" value={formData.service} onChange={(e) => { if (e.target.value === '__custom__') { setShowCustomPlatform(true); setFormData(p => ({...p, service: ''})); } else { handleInputChange(e); }}} className="flex-grow bg-white border border-slate-200 p-3 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" required>
                      <option value="">Seleccionar...</option>
                      {availablePlatforms.map(p => <option key={p} value={p}>{p}</option>)}
                      <option value="__custom__">+ Otro Producto</option>
                    </select>
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">Presentación / Detalles</label>
                <input type="text" name="email" value={formData.email} onChange={handleInputChange} placeholder="Ej: 30 Gramos / Resina Puro" className="w-full bg-white border border-slate-200 p-3 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
              {!isBulkMode && (
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Variante / Notas</label>
                  {showCustomProfile ? (
                    <input type="text" name="profile" value={formData.profile} onChange={handleInputChange} placeholder="Ej: Tarro 30g" className="w-full bg-white border border-slate-200 p-3 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                  ) : (
                    <select name="profile" value={formData.profile} onChange={(e) => { if (e.target.value === '__custom__') { setShowCustomProfile(true); setFormData(p => ({...p, profile: ''})); } else { handleInputChange(e); }}} className="w-full bg-white border border-slate-200 p-3 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
                      <option value="">Seleccionar...</option>
                      {availableProfiles.map(p => <option key={p} value={p}>{p}</option>)}
                      <option value="__custom__">+ Otra Variante</option>
                    </select>
                  )}
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">Detalles de Envío</label>
                <input type="text" name="pass" value={formData.pass} onChange={handleInputChange} placeholder="Ej: Envío Gratis Guatemala" className="w-full bg-white border border-slate-200 p-3 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">Promoción / Tag</label>
                <input type="text" name="pin" value={formData.pin} onChange={handleInputChange} placeholder="Ej: Oferta Especial" className="w-full bg-white border border-slate-200 p-3 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">Precio (Q)</label>
                <input type="number" name="price" value={formData.price} onChange={handleInputChange} placeholder="Q199" className="w-full bg-white border border-slate-200 p-3 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">Costo (Q)</label>
                <input type="number" name="cost" value={formData.cost} onChange={handleInputChange} placeholder="Q70" className="w-full bg-white border border-slate-200 p-3 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">Stock Disponible</label>
                <input type="number" name="uses" value={formData.uses} onChange={handleInputChange} placeholder="100" className="w-full bg-white border border-slate-200 p-3 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">Proveedor / Origen</label>
                {showCustomProvider ? (
                  <input type="text" name="provider" value={formData.provider} onChange={handleInputChange} placeholder="Nombre..." className="w-full bg-white border border-slate-200 p-3 rounded-lg text-sm placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                ) : (
                  <select name="provider" value={formData.provider} onChange={(e) => { if (e.target.value === '__custom__') { setShowCustomProvider(true); setFormData(p => ({...p, provider: ''})); } else { handleInputChange(e); }}} className="w-full bg-white border border-slate-200 p-3 rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
                    <option value="">Seleccionar...</option>
                    {availableProviders.map(p => <option key={p} value={p}>{p}</option>)}
                    <option value="__custom__">+ Otro</option>
                  </select>
                )}
              </div>
              <div className="md:col-span-2 mt-4 flex gap-3">
                <button type="submit" className="flex-grow bg-primary text-white font-medium py-3 rounded-lg hover:bg-primary-hover transition-colors text-sm">
                  {editingAccount ? 'Guardar Cambios' : (isBulkMode ? `Crear Variantes ${bulkRange}` : 'Agregar Producto')}
                </button>
                {editingAccount && (
                  <button type="button" onClick={() => { handleDeleteAccount(editingAccount.id); closeModal(); }} className="bg-red-50 text-red-600 hover:bg-red-100 font-medium py-3 px-6 rounded-lg transition-colors text-sm">Eliminar</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {isManageListsOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 p-6 md:p-8 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base font-semibold text-on-surface">Master Config</h2>
              <button onClick={() => setIsManageListsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto p-2">
              <div>
                <h3 className="text-xs font-medium text-primary mb-4">Platforms</h3>
                <div className="flex gap-2 mb-4">
                  <input type="text" placeholder="Add..." value={newPlatformInput} onChange={(e) => setNewPlatformInput(e.target.value)} className="flex-grow bg-white border border-slate-200 p-2 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                  <button onClick={handleAddPlatform} className="bg-primary/10 text-primary p-2 rounded-lg hover:bg-primary/20 transition-colors"><span className="material-symbols-outlined">add</span></button>
                </div>
                <div className="space-y-2">
                  {platforms.map(p => (
                    <div key={p} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg text-xs font-medium">
                      <span>{p}</span>
                      <button onClick={() => handleDeletePlatform(p)} className="text-error opacity-20 hover:opacity-100 transition-opacity"><span className="material-symbols-outlined text-sm">delete</span></button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-medium text-tertiary mb-4">Suppliers</h3>
                <div className="flex gap-2 mb-4">
                  <input type="text" placeholder="Add..." value={newProviderInput} onChange={(e) => setNewProviderInput(e.target.value)} className="flex-grow bg-white border border-slate-200 p-2 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                  <button onClick={handleAddProvider} className="bg-tertiary/10 text-tertiary p-2 rounded-lg hover:bg-tertiary/20 transition-colors"><span className="material-symbols-outlined">add</span></button>
                </div>
                <div className="space-y-2">
                  {providers.map(p => (
                    <div key={p} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg text-xs font-medium">
                      <span>{p}</span>
                      <button onClick={() => handleDeleteProvider(p)} className="text-error opacity-20 hover:opacity-100 transition-opacity"><span className="material-symbols-outlined text-sm">delete</span></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setIsManageListsOpen(false)} className="bg-primary text-white font-medium py-3 rounded-lg mt-6 hover:bg-primary-hover transition-colors text-sm">Cerrar</button>
          </div>
        </div>
      )}

      {historyModalOpen && selectedHistory && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 p-6 md:p-8 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-base font-semibold text-on-surface">Historial de Entrega</h2>
                <p className="text-xs font-medium text-slate-400 mt-1">{selectedHistory.account.service} - Perfil #{selectedHistory.account.profile}</p>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="flex-grow overflow-y-auto space-y-3 pr-2">
              {selectedHistory.history.length > 0 ? (
                selectedHistory.history.map((sale, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{sale.customer || 'Venta Directa'}</p>
                      <p className="text-xs font-medium text-slate-400 mt-0.5">{new Date(sale.id).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => onMarkSaleAsSuccess(sale.id, selectedHistory.account.id)} className="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center border border-emerald-100 hover:bg-emerald-100 transition-colors"><span className="material-symbols-outlined text-lg">check</span></button>
                      <button onClick={() => { if(window.confirm('¿Marcar como FALLIDA?')) onMarkSaleAsFailed(sale.id, selectedHistory.account.id); }} className="w-8 h-8 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center border border-rose-100 hover:bg-rose-100 transition-colors"><span className="material-symbols-outlined text-lg">block</span></button>
                      {(sale.customerId || Object.values(chats).find(c => c.customerName === sale.customer)?.from) && (
                        <button onClick={() => setPreviewChatId(sale.customerId || Object.values(chats).find(c => c.customerName === sale.customer)?.from)} className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center border border-primary/20 hover:bg-primary/20 transition-colors"><span className="material-symbols-outlined text-lg">visibility</span></button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-slate-300">
                  <span className="material-symbols-outlined text-4xl">history</span>
                  <p className="text-xs font-medium mt-2">Sin registros</p>
                </div>
              )}
            </div>
            <button onClick={() => setHistoryModalOpen(false)} className="bg-primary text-white font-medium py-3 rounded-lg mt-6 hover:bg-primary-hover transition-colors text-sm">Cerrar</button>
          </div>
        </div>
      )}

      {previewChatId && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden border border-slate-200">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-semibold text-sm text-on-surface">Vista Previa Chat</h3>
              <button onClick={() => setPreviewChatId(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="flex-grow overflow-y-auto p-5 space-y-3 bg-slate-50/50 custom-scrollbar">
              {chats[previewChatId]?.messages?.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] p-3 rounded-xl text-xs font-medium shadow-sm ${m.role === 'user' ? 'bg-white text-slate-700 border border-slate-200/60' : 'bg-primary text-white'}`}>
                    {m.imageUrl ? <img src={m.imageUrl} alt="img" className="rounded-lg mb-2 max-h-40" /> : <p>{m.content}</p>}
                    <p className="text-xs mt-1 opacity-40">{new Date(m.timestampRaw || Date.now()).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-5 bg-white border-t border-slate-200 flex gap-3">
               <button onClick={() => { onSendMessage({ to: previewChatId, content: '⚠️ *Recordatorio:* Pendiente tu pago. Quedo atento. 🙏' }); alert('Enviado'); }} className="flex-grow bg-tertiary text-white font-medium py-3 rounded-lg hover:bg-emerald-600 transition-colors text-sm">Recordatorio</button>
               <button onClick={() => setPreviewChatId(null)} className="px-5 bg-slate-800 text-white font-medium py-3 rounded-lg hover:bg-slate-900 transition-colors text-sm">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
