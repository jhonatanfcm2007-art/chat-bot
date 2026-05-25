import React, { useState, useEffect } from 'react';

const Campaigns = ({ campaigns, chats, socket }) => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTags, setSelectedTags] = useState(['all']);
  const [delaySecs, setDelaySecs] = useState(20);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [previewName, setPreviewName] = useState('Juan');
  const [isCreatedSuccess, setIsCreatedSuccess] = useState(false);

  // Extract all unique tags in the system
  const allTags = [];
  Object.values(chats).forEach(chat => {
    if (chat.tags && Array.isArray(chat.tags)) {
      chat.tags.forEach(tag => {
        if (!allTags.includes(tag)) {
          allTags.push(tag);
        }
      });
    }
  });

  // Automatically select the first campaign if none selected
  useEffect(() => {
    if (campaigns && campaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(campaigns[campaigns.length - 1].id);
    }
  }, [campaigns]);

  const handleTagToggle = (tag) => {
    if (tag === 'all') {
      setSelectedTags(['all']);
    } else {
      setSelectedTags(prev => {
        const filtered = prev.filter(t => t !== 'all');
        if (filtered.includes(tag)) {
          const res = filtered.filter(t => t !== tag);
          return res.length === 0 ? ['all'] : res;
        } else {
          return [...filtered, tag];
        }
      });
    }
  };

  // Get recipient count based on selection
  const getRecipientCount = () => {
    const isAll = selectedTags.includes('all');
    let count = 0;
    Object.keys(chats).forEach(chatId => {
      // Exclude admin
      const chat = chats[chatId];
      if (isAll) {
        count++;
      } else {
        const tags = chat.tags || [];
        if (selectedTags.some(t => tags.includes(t))) {
          count++;
        }
      }
    });
    return count;
  };

  const handleCreateCampaign = (e) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;

    socket.emit('create_campaign', {
      name,
      message,
      targetTags: selectedTags,
      delay: delaySecs
    });

    setName('');
    setMessage('');
    setSelectedTags(['all']);
    setDelaySecs(20);
    setIsCreatedSuccess(true);
    setTimeout(() => setIsCreatedSuccess(false), 3000);
  };

  const handleStartCampaign = (id) => {
    socket.emit('start_campaign', id);
  };

  const handlePauseCampaign = (id) => {
    socket.emit('pause_campaign', id);
  };

  const handleDeleteCampaign = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta campaña permanentemente del historial?')) {
      socket.emit('delete_campaign', id);
      if (selectedCampaignId === id) {
        setSelectedCampaignId(null);
      }
    }
  };

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  // Parse {{nombre}} preview
  const previewMessage = message.replace(/\{\{\s*nombre\s*\}\}/gi, previewName);

  return (
    <div className="flex-grow flex justify-center p-6 md:p-10 bg-background overflow-y-auto custom-scrollbar relative">
      <div className="w-full flex flex-col h-full">
        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col relative h-full overflow-hidden">
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[28px]">campaign</span>
            </div>
            <div>
              <h3 className="font-black text-on-surface text-3xl tracking-tight uppercase">Campañas Masivas</h3>
              <p className="text-xs text-on-surface-variant font-medium mt-1">Envía promociones y avisos masivos simulando el comportamiento humano.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow overflow-hidden min-h-0">
            
            {/* COLUMN 1: Create & History list */}
            <div className="lg:col-span-7 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar min-h-0 h-full">
              
              {/* Form creation */}
              <div className="border border-slate-100 rounded-3xl p-6 bg-slate-50/20 shadow-sm">
                <h4 className="font-black text-xs uppercase tracking-wider text-on-surface mb-5">Nueva Campaña</h4>
                
                <form onSubmit={handleCreateCampaign} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-1">Nombre de la Campaña</label>
                    <input 
                      type="text" 
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-primary transition-all text-on-surface font-semibold"
                      placeholder="Ej. Promoción Netflix Fin de Mes"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-1">Segmentación de Clientes</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => handleTagToggle('all')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          selectedTags.includes('all') 
                            ? 'bg-primary text-white' 
                            : 'bg-white text-on-surface-variant border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Todos los Chats ({Object.keys(chats).length})
                      </button>

                      {allTags.map(tag => {
                        const count = Object.values(chats).filter(c => c.tags?.includes(tag)).length;
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleTagToggle(tag)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                              selectedTags.includes(tag) 
                                ? 'bg-primary text-white' 
                                : 'bg-white text-on-surface-variant border border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {tag} ({count})
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-on-surface-variant italic">Destinatarios detectados para esta selección: <span className="font-bold text-primary">{getRecipientCount()}</span></p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-1">Intervalo Promedio (Segundos)</label>
                      <input 
                        type="number" 
                        min="5" 
                        max="600"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-primary transition-all text-on-surface font-semibold"
                        value={delaySecs}
                        onChange={e => setDelaySecs(Math.max(5, parseInt(e.target.value) || 5))}
                        required
                      />
                      <p className="text-[9px] text-on-surface-variant mt-1">Se aplicará una variación del +/-20% para simular comportamiento natural.</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-1">Previsualizar Variable</label>
                      <input 
                        type="text" 
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-primary transition-all text-on-surface font-semibold"
                        value={previewName}
                        onChange={e => setPreviewName(e.target.value)}
                        placeholder="Nombre de prueba"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-on-surface-variant mb-1">Plantilla de Mensaje</label>
                    <textarea 
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-primary transition-all text-on-surface font-semibold min-h-[100px] resize-y"
                      placeholder="Escribe tu mensaje aquí. Usa {{nombre}} para personalizar automáticamente con el nombre del cliente."
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      required
                    />
                  </div>

                  {message.trim() && (
                    <div className="bg-slate-100/50 p-4 rounded-xl border border-slate-100 text-xs">
                      <span className="block text-[9px] font-black uppercase tracking-wider text-on-surface-variant mb-2">Vista Previa del Mensaje</span>
                      <div className="whitespace-pre-wrap font-sans text-on-surface font-medium leading-relaxed">{previewMessage}</div>
                    </div>
                  )}

                  <button 
                    type="submit"
                    className={`w-full py-4 rounded-xl font-black tracking-widest uppercase text-xs transition-all duration-300 flex items-center justify-center gap-2 ${
                      isCreatedSuccess 
                        ? 'bg-tertiary text-white' 
                        : 'bg-primary text-white hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/15'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">{isCreatedSuccess ? 'verified' : 'send_and_archive'}</span>
                    {isCreatedSuccess ? 'Campaña Creada' : 'Guardar y Preparar Campaña'}
                  </button>
                </form>
              </div>

              {/* History list */}
              <div>
                <h4 className="font-black text-xs uppercase tracking-wider text-on-surface mb-4">Historial de Campañas</h4>
                {campaigns.length === 0 ? (
                  <div className="border border-slate-100 rounded-2xl p-8 text-center text-on-surface-variant text-xs font-semibold">
                    No se han creado campañas aún.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaigns.slice().reverse().map(camp => {
                      const percentage = camp.totalContacts > 0 ? Math.round(((camp.sentCount + camp.failedCount) / camp.totalContacts) * 100) : 0;
                      
                      let statusBadgeColor = 'bg-slate-100 text-slate-600';
                      if (camp.status === 'processing') statusBadgeColor = 'bg-primary/10 text-primary animate-pulse';
                      if (camp.status === 'paused') statusBadgeColor = 'bg-amber-100 text-amber-700';
                      if (camp.status === 'completed') statusBadgeColor = 'bg-emerald-100 text-emerald-700';
                      
                      return (
                        <div 
                          key={camp.id}
                          onClick={() => setSelectedCampaignId(camp.id)}
                          className={`p-4 border rounded-2xl transition-all cursor-pointer flex justify-between items-center group ${
                            selectedCampaignId === camp.id 
                              ? 'border-primary bg-primary/5 shadow-sm' 
                              : 'border-slate-100 bg-white hover:border-slate-200'
                          }`}
                        >
                          <div className="flex-grow pr-4">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="font-black text-xs text-on-surface group-hover:text-primary transition-colors">{camp.name}</span>
                              <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full ${statusBadgeColor}`}>
                                {camp.status === 'pending' ? 'pendiente' : 
                                 camp.status === 'processing' ? 'ejecutando' : 
                                 camp.status === 'paused' ? 'pausado' : 'completado'}
                              </span>
                            </div>
                            
                            <p className="text-[10px] text-on-surface-variant font-semibold">
                              Progreso: <span className="text-on-surface">{camp.sentCount + camp.failedCount}</span> / <span className="text-on-surface">{camp.totalContacts}</span> ({percentage}%)
                            </p>

                            {/* Tiny progress bar */}
                            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                              <div 
                                className="bg-primary h-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                            {camp.status === 'pending' && (
                              <button 
                                onClick={() => handleStartCampaign(camp.id)}
                                className="w-8 h-8 rounded-lg bg-slate-50 text-primary border border-slate-100 flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm"
                              >
                                <span className="material-symbols-outlined text-base">play_arrow</span>
                              </button>
                            )}

                            {camp.status === 'processing' && (
                              <button 
                                onClick={() => handlePauseCampaign(camp.id)}
                                className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                              >
                                <span className="material-symbols-outlined text-base">pause</span>
                              </button>
                            )}

                            {camp.status === 'paused' && (
                              <button 
                                onClick={() => handleStartCampaign(camp.id)}
                                className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                              >
                                <span className="material-symbols-outlined text-base">play_arrow</span>
                              </button>
                            )}

                            <button 
                              onClick={() => handleDeleteCampaign(camp.id)}
                              className="w-8 h-8 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

            {/* COLUMN 2: Selected campaign details & logs */}
            <div className="lg:col-span-5 flex flex-col h-full min-h-0 bg-slate-50/20 border border-slate-100 rounded-3xl p-6 overflow-hidden">
              {selectedCampaign ? (
                <div className="flex flex-col h-full min-h-0 overflow-hidden">
                  
                  {/* Stats header */}
                  <div className="mb-6 flex-shrink-0">
                    <span className="block text-[8px] font-black uppercase tracking-wider text-on-surface-variant mb-1">Detalle de Ejecución</span>
                    <h4 className="font-black text-lg text-on-surface truncate mb-3">{selectedCampaign.name}</h4>
                    
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-white border border-slate-100 p-3 rounded-2xl text-center">
                        <span className="block text-[8px] font-extrabold uppercase text-on-surface-variant mb-1">Enviados</span>
                        <span className="font-black text-sm text-emerald-600">{selectedCampaign.sentCount}</span>
                      </div>
                      <div className="bg-white border border-slate-100 p-3 rounded-2xl text-center">
                        <span className="block text-[8px] font-extrabold uppercase text-on-surface-variant mb-1">Fallidos</span>
                        <span className="font-black text-sm text-red-500">{selectedCampaign.failedCount}</span>
                      </div>
                      <div className="bg-white border border-slate-100 p-3 rounded-2xl text-center">
                        <span className="block text-[8px] font-extrabold uppercase text-on-surface-variant mb-1">Pendientes</span>
                        <span className="font-black text-sm text-slate-500">
                          {selectedCampaign.totalContacts - (selectedCampaign.sentCount + selectedCampaign.failedCount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Message template used */}
                  <div className="mb-6 bg-white p-4 border border-slate-100 rounded-2xl flex-shrink-0">
                    <span className="block text-[8px] font-black uppercase tracking-wider text-on-surface-variant mb-2">Mensaje Utilizado</span>
                    <p className="text-[11px] font-medium leading-relaxed whitespace-pre-wrap text-on-surface max-h-[80px] overflow-y-auto custom-scrollbar">
                      {selectedCampaign.message}
                    </p>
                  </div>

                  {/* Recipients log */}
                  <div className="flex-grow flex flex-col min-h-0">
                    <span className="block text-[8px] font-black uppercase tracking-wider text-on-surface-variant mb-3 flex-shrink-0">Destinatarios e Historial de Envíos</span>
                    
                    <div className="flex-grow overflow-y-auto pr-1 space-y-2 custom-scrollbar min-h-0">
                      {selectedCampaign.contacts.map((contact, idx) => {
                        let contactStatusBadge = 'bg-slate-50 text-slate-500';
                        if (contact.status === 'sent') contactStatusBadge = 'bg-emerald-50 text-emerald-700';
                        if (contact.status === 'failed') contactStatusBadge = 'bg-red-50 text-red-600';

                        return (
                          <div 
                            key={idx} 
                            className="bg-white border border-slate-100 p-3 rounded-xl flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0 flex-grow">
                              <span className="font-semibold text-on-surface block truncate">{contact.name}</span>
                              <span className="text-[9px] text-on-surface-variant font-mono">{contact.chatId}</span>
                              {contact.error && (
                                <span className="block text-[9px] text-red-500 font-medium mt-1 leading-tight">{contact.error}</span>
                              )}
                            </div>

                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md flex-shrink-0 ${contactStatusBadge}`}>
                              {contact.status === 'pending' ? 'espera' : 
                               contact.status === 'sent' ? 'enviado' : 'falló'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px] text-slate-300 mb-3">campaign</span>
                  <p className="text-xs font-semibold">Selecciona una campaña del historial para ver el progreso detallado en tiempo real.</p>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default Campaigns;
