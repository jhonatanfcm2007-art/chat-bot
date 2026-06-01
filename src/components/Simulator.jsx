import React, { useState, useEffect, useRef } from 'react';

const Simulator = ({ chats, selectedChat, onSelectChat, onSendMessage, accounts = [], salesHistory = [], onSale, onUpdateTag, onDeleteChat, onDeleteMessage, onBulkClearTags, onToggleAI, serverUrl }) => {
  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSaleAccount, setSelectedSaleAccount] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [showContactInfo, setShowContactInfo] = useState(false);
  
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [openTagMenu, setOpenTagMenu] = useState(null);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const chatEndRef = useRef(null);

  const TAG_UI = {
    'pagado': { label: 'PAGADO', color: '#00a884', classes: 'bg-[#00a884]/10 text-[#00a884] border-[#00a884]/20' },
    'pago-pendiente': { label: 'Pago Pendiente', color: '#ff9800', classes: 'bg-[#ff9800]/10 text-[#ff9800] border-[#ff9800]/20' },
    'soporte': { label: 'Soporte', color: '#607d8b', classes: 'bg-[#607d8b]/10 text-[#607d8b] border-[#607d8b]/20' },
    'interesado': { label: 'Interesado', color: '#2196f3', classes: 'bg-[#2196f3]/10 text-[#2196f3] border-[#2196f3]/20' }
  };
  
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats, selectedChat]);

  useEffect(() => {
    const handleCloseMenu = () => {
      setOpenTagMenu(null);
      setIsFilterMenuOpen(false);
      setActiveMessageMenu(null);
    };
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  const handleSend = () => {
    if (!inputValue.trim() || !selectedChat) return;
    onSendMessage({ to: selectedChat, content: inputValue });
    setInputValue('');
  };

  const parseTimeString = (timeStr) => {
    if (!timeStr) return 0;
    try {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
      if (!match) return 0;
      let [_, h, m, ampm] = match;
      h = parseInt(h);
      if (ampm) {
         if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
         if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
      }
      let d = new Date();
      d.setHours(h, parseInt(m), 0, 0);
      return d.getTime();
    } catch(e) {
      return 0;
    }
  };

  const formatChatTime = (timestamp) => {
    if (!timestamp || timestamp < 1000000) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (msgDay.getTime() === today.getTime()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (msgDay.getTime() === yesterday.getTime()) {
      return 'Ayer';
    } else if (now.getTime() - date.getTime() < 7 * 86400000) {
      const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      return dias[date.getDay()];
    } else {
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
    }
  };

  const formatMediaUrl = (url) => {
    if (!url) return '';
    
    // Si ya es una URL absoluta correcta del mismo servidor, usarla tal cual
    if (url.startsWith('http')) {
      // Normalizar URLs antiguas: si apuntan al dominio de Railway pero la imagen está en /uploads o /api,
      // convertirlas a rutas relativas para que el frontend use su propio origin
      try {
        const parsed = new URL(url);
        if (parsed.pathname.startsWith('/uploads/') || parsed.pathname.startsWith('/api/media/')) {
          // Usar el serverUrl como base
          const base = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
          return `${base}${parsed.pathname}`;
        }
      } catch(e) {}
      return url;
    }
    
    // Ruta relativa: prepend el serverUrl del socket
    const base = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${base}${cleanPath}`;
  };

  const activeChatData = selectedChat ? chats[selectedChat] : null;
  
  const chatSessions = Object.entries(chats)
    .map(([id, data], index) => {
      const messages = data.messages || [];
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      
      // Intentar obtener el tiempo más reciente de varias fuentes
      const updatedAt = Number(data.updatedAt) || 0;
      const lastMsgTime = lastMessage ? (Number(lastMessage.timestampRaw) || 0) : 0;
      
      // La actividad oficial es el máximo entre el updatedAt del objeto y el tiempo del último mensaje
      let activityTime = Math.max(updatedAt, lastMsgTime);
      
      // Fallback a index MUY bajo (para que chats sin tiempo queden al final)
      if (!activityTime) activityTime = -1 * (Object.keys(chats).length - index);
      
      return {
        ...data,
        customerName: data.customerName || 'Cliente sin nombre',
        from: data.from || id,
        tags: data.tags || ['activo'],
        activityTime: activityTime, // Usamos un nombre claro
        lastMessage: lastMessage
      };
    })
    .filter(chat => {
      const sTerm = searchTerm.toLowerCase();
      const nameMatch = (chat.customerName || '').toLowerCase().includes(sTerm);
      const fromMatch = (chat.from || '').toLowerCase().includes(sTerm);
      
      const messagesMatch = chat.messages && chat.messages.some(m => 
        (m.content || '').toLowerCase().includes(sTerm) || 
        (m.body || '').toLowerCase().includes(sTerm)
      );

      const searchMatch = nameMatch || fromMatch || messagesMatch;
      
      const tagMatch = filterTag === 'all' || 
                       chat.tags.includes(filterTag) || 
                       (filterTag === 'pago-pendiente' && chat.tags.includes('entregado'));
      
      return searchMatch && tagMatch;
    })
    .sort((a, b) => b.activityTime - a.activityTime);

  const customerSales = salesHistory.filter(sale => sale.customerId === selectedChat);
  const availableInventory = accounts.filter(acc => acc.status === 'Available' || parseInt(acc.uses) > 0);

  const handleSellToCustomer = () => {
    if (!selectedSaleAccount) return;
    const accountToSell = availableInventory.find(a => String(a.id) === String(selectedSaleAccount));
    if (accountToSell) {
      if(window.confirm(`¿Confirmas la venta de ${accountToSell.service} por $${accountToSell.price}? Se descontará del inventario.`)){
        // 1. Registrar la venta y actualizar inventario
        onSale(accountToSell, selectedChat, activeChatData.customerName);
        setSelectedSaleAccount('');
        
        // 2. Autocambiar el estado del cliente a pagado
        onUpdateTag(selectedChat, ['pagado']);

        // 3. Generar y enviar el mensaje con los datos de cuenta automáticamente
        const messageHeader = `🎉 ¡Gracias por tu compra de *${accountToSell.service}*!`;
        const accountDetails = `*Correo:* ${accountToSell.email}\n*Contraseña:* ${accountToSell.pass}`;
        
        let profileDetails = '';
        if (accountToSell.profile || accountToSell.pin) {
          profileDetails = `\n*Perfil:* ${accountToSell.profile || 'Principal'}`;
          if (accountToSell.pin) profileDetails += `\n*PIN:* ${accountToSell.pin}`;
        }
        
        let expDetail = '';
        if (accountToSell.expiration) {
          expDetail = `\n*Vencimiento:* ${accountToSell.expiration}`;
        }
        
        const finalMessage = `${messageHeader}\n\n${accountDetails}${profileDetails}${expDetail}\n\n⚠️ Recuerda NO modificar la contraseña ni alterar otros perfiles para mantener tu garantía.`;
        
        onSendMessage({ to: selectedChat, content: finalMessage });
      }
    }
  };

  const getTagStyle = (tags) => {
    if (!tags || tags.length === 0) return { label: 'Sin asignar', classes: 'bg-slate-100 text-slate-400 border-slate-200' };
    const key = tags[0];
    return TAG_UI[key] || { label: 'Sin asignar', classes: 'bg-slate-100 text-slate-400 border-slate-200' };
  };

  const getTagKey = (tags) => {
    return (tags && tags.length > 0) ? tags[0] : 'sin-asignar';
  };

  return (
    <div className="flex flex-grow overflow-hidden relative font-sans bg-slate-50">
      {/* 1. Chat List Sidebar (Left Column) */}
      <section className={`w-full md:w-[400px] flex-shrink-0 flex flex-col bg-white overflow-hidden relative z-10 border-r border-slate-200 ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between mb-4">
             <div className="relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsFilterMenuOpen(!isFilterMenuOpen); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterTag !== 'all' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  <span className="material-symbols-outlined text-sm">{filterTag !== 'all' ? 'filter_list_off' : 'filter_list'}</span>
                  {filterTag !== 'all' ? TAG_UI[filterTag]?.label : 'Filtrar'}
                </button>

                {isFilterMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] py-2 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                    <div 
                      className={`px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-3 ${filterTag === 'all' ? 'bg-primary/5' : ''}`}
                      onClick={() => { setFilterTag('all'); setIsFilterMenuOpen(false); }}
                    >
                      <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                      <span className="text-[11px] font-black text-slate-600 tracking-widest uppercase">Ver Todos</span>
                    </div>
                    {Object.entries(TAG_UI).map(([key, style]) => (
                      <div 
                        key={key}
                        className={`px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-3 ${filterTag === key ? 'bg-primary/5' : ''}`}
                        onClick={() => { setFilterTag(key); setIsFilterMenuOpen(false); }}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: style.color }}></div>
                        <span className="text-[11px] font-black text-slate-600 tracking-widest uppercase">{style.label}</span>
                      </div>
                    ))}
                    
                    {filterTag !== 'all' && chatSessions.length > 0 && (
                      <div 
                        className="mt-2 pt-2 border-t border-slate-100 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-3 text-slate-500"
                        onClick={() => {
                          onBulkClearTags(chatSessions.map(c => c.from));
                          setIsFilterMenuOpen(false);
                          setFilterTag('all');
                        }}
                      >
                        <span className="material-symbols-outlined text-lg">label_off</span>
                        <span className="text-[10px] font-black tracking-widest uppercase">Quitar Etiquetas ({chatSessions.length})</span>
                      </div>
                    )}
                  </div>
                )}
             </div>
             
             <div className="flex items-center gap-3 text-slate-400">
                {filterTag !== 'all' && (
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {chatSessions.length} Resultados
                  </span>
                )}
             </div>
          </div>
          
          <div className="relative mb-4">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input 
              className="w-full bg-slate-100 border border-transparent rounded-full py-2 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-primary/20 transition-all outline-none" 
              placeholder="Buscar contacto..." 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar">
          {chatSessions.length > 0 ? (
            chatSessions.map((chat) => {
              const isSelected = selectedChat === chat.from;
              return (
                <div 
                  key={chat.from}
                  onClick={() => onSelectChat(chat.from)}
                  className={`flex gap-3 px-6 py-4 cursor-pointer transition-all relative border-b border-slate-50 ${
                    isSelected 
                      ? 'bg-primary/10' 
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-slate-500 font-bold text-sm border-2 border-white shadow-sm overflow-hidden">
                    {chat.imageUrl ? (
                      <img src={chat.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      chat.customerName ? chat.customerName.charAt(0).toUpperCase() : '?'
                    )}
                  </div>
                  <div className="flex-grow overflow-hidden flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className={`font-bold truncate text-[13px] ${isSelected ? 'text-slate-800' : 'text-slate-700'}`}>
                        {chat.customerName}
                      </h4>
                      <div className="flex items-center gap-2">
                        <div 
                           className={`w-[110px] py-0.5 rounded-full text-[9px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${getTagStyle(chat.tags).classes}`}
                           onClick={(e) => {
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              setOpenTagMenu(openTagMenu && openTagMenu.from === chat.from ? null : { 
                                from: chat.from, 
                                top: rect.bottom, 
                                left: rect.left 
                              });
                           }}
                        >
                           <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getTagStyle(chat.tags).color || '#cbd5e1' }}></div>
                           {getTagStyle(chat.tags).label}
                           <span className="material-symbols-outlined text-[10px]">expand_more</span>
                        </div>

                        {openTagMenu && openTagMenu.from === chat.from && (
                           <div 
                              className="fixed w-48 bg-white rounded-xl shadow-2xl border border-slate-100 z-[999] py-2 animate-in fade-in zoom-in-95 duration-200"
                              style={{ top: openTagMenu.top, left: openTagMenu.left }}
                           >
                              {Object.entries(TAG_UI).map(([key, style]) => (
                                 <div 
                                    key={key}
                                    className="px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-3"
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       onUpdateTag(chat.from, [key]);
                                       setOpenTagMenu(null);
                                    }}
                                 >
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: style.color }}></div>
                                    <span className="text-[11px] font-bold text-slate-600">{style.label}</span>
                                 </div>
                              ))}
                           </div>
                        )}

                        <span className="text-[10px] text-slate-400 font-medium">
                          {formatChatTime(chat.activityTime > 0 ? chat.activityTime : chat.updatedAt)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between overflow-hidden">
                      <p className="text-[11px] text-slate-400 truncate font-medium max-w-[80%]">
                        {chat.lastMessage ? chat.lastMessage.content : 'No hay mensajes'}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                         <div 
                           className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${chat.aiDisabled ? 'bg-slate-300' : 'bg-[#00a884] shadow-sm shadow-[#00a884]/20'}`}
                           title={chat.aiDisabled ? 'IA Desactivada' : 'IA Activa'}
                         ></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center flex flex-col items-center gap-3 opacity-30">
               <span className="material-symbols-outlined text-5xl">chat_bubble_outline</span>
               <p className="text-xs font-bold uppercase tracking-widest">Sin conversaciones</p>
            </div>
          )}
        </div>
      </section>

      <section className={`flex-grow flex flex-col relative overflow-hidden bg-[#f7f4f0] ${selectedChat && !showContactInfo ? 'flex' : 'hidden md:flex'}`}>
        {activeChatData ? (
          <>
            <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-slate-200 z-10">
              <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-all px-2 py-1 rounded-xl"
                onClick={() => setShowContactInfo(!showContactInfo)}
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); onSelectChat(null); }}
                  className="md:hidden w-8 h-8 flex items-center justify-center text-slate-500 rounded-lg hover:bg-slate-100"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shadow-sm shadow-primary/20">
                  {activeChatData.customerName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-[15px] leading-tight">{activeChatData.customerName}</h3>
                  <p className="text-[11px] text-slate-400 font-medium leading-none">Desconectado</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                  <span className={`text-[11px] font-black uppercase tracking-widest ${activeChatData.aiDisabled ? 'text-slate-400' : 'text-[#00a884]'}`}>
                    IA {activeChatData.aiDisabled ? 'Desactivada' : 'Activa'}
                  </span>
                  <button 
                    onClick={() => onToggleAI(selectedChat, !activeChatData.aiDisabled)}
                    className={`w-10 h-5 rounded-full relative transition-all duration-500 shadow-inner ${activeChatData.aiDisabled ? 'bg-slate-200' : 'bg-[#00a884]'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-500 ${activeChatData.aiDisabled ? 'left-0.5' : 'left-[1.4rem]'}`}></div>
                  </button>
                </div>
              </div>
            </header>

            <div className="flex-grow overflow-y-auto flex flex-col relative group whatsapp-pattern custom-scrollbar">
              <div className="p-6 md:p-10 space-y-4 flex flex-col relative z-20">
                {activeChatData.messages.map((msg, idx) => {
                  const currentMsgDate = msg.timestampRaw ? new Date(Number(msg.timestampRaw)) : null;
                  const prevMsg = idx > 0 ? activeChatData.messages[idx - 1] : null;
                  const prevMsgDate = prevMsg && prevMsg.timestampRaw ? new Date(Number(prevMsg.timestampRaw)) : null;
                  
                  let showDatePill = false;
                  let dateString = '';
                  
                  if (currentMsgDate) {
                     if (!prevMsgDate || currentMsgDate.toDateString() !== prevMsgDate.toDateString()) {
                        showDatePill = true;
                        const today = new Date();
                        const yesterday = new Date(today);
                        yesterday.setDate(yesterday.getDate() - 1);
                        
                        if (currentMsgDate.toDateString() === today.toDateString()) {
                           dateString = 'Hoy';
                        } else if (currentMsgDate.toDateString() === yesterday.toDateString()) {
                           dateString = 'Ayer';
                        } else {
                           dateString = currentMsgDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                        }
                     }
                  }

                  const timeString = currentMsgDate ? currentMsgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (msg.time || '11:09');

                  return (
                  <React.Fragment key={idx}>
                    {showDatePill && (
                      <div className="flex justify-center my-4">
                        <span className="bg-white/80 backdrop-blur text-slate-500 text-[11px] font-bold px-4 py-1.5 rounded-xl shadow-sm border border-slate-100 uppercase tracking-widest">
                          {dateString}
                        </span>
                      </div>
                    )}
                    <div className={`w-full flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`flex items-center gap-2 group max-w-[75%] md:max-w-[60%] relative ${msg.role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
                        <div className={`transition-all relative ${
                          msg.role === 'user' 
                            ? 'bg-white text-slate-800 rounded-tr-xl rounded-bl-xl rounded-br-xl shadow-sm border border-slate-100' 
                            : 'bg-[#d9fdd3] text-slate-800 rounded-tl-xl rounded-bl-xl rounded-br-xl shadow-sm'
                        } ${msg.imageUrl ? 'p-1' : 'px-4 py-2'}`}>
                          
                          {msg.imageUrl && (
                            <div className="rounded-lg overflow-hidden mb-1 flex justify-center bg-black/5 min-h-[80px]">
                              <img 
                                src={formatMediaUrl(msg.imageUrl)} 
                                alt="Imagen" 
                                onClick={() => setFullscreenImage(formatMediaUrl(msg.imageUrl))}
                                className="max-w-full max-h-[250px] md:max-h-[300px] object-contain cursor-pointer transition-transform hover:scale-[1.02]"
                                loading="lazy"
                                onError={(e) => {
                                  // Si falla la URL original, intentar con la ruta proxy como fallback
                                  const original = e.target.src;
                                  if (!original.includes('/api/media/') && msg.mediaId) {
                                    // Intentar a través del proxy con el ID del media como mediaId
                                    const proxyUrl = formatMediaUrl(`/api/media/${msg.mediaId}`);
                                    e.target.src = proxyUrl;
                                  } else {
                                    // Si ya falló el proxy, mostrar placeholder
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = '<div class="flex flex-col items-center justify-center py-6 px-4 text-slate-400"><span class="material-symbols-outlined text-3xl mb-1">image_not_supported</span><span class="text-[10px] font-bold">Imagen no disponible</span></div>';
                                  }
                                }}
                              />
                            </div>
                          )}
                          
                          {msg.fileUrl && msg.content?.includes('[AUDIO]') && (
                            <div className="mb-2 w-full max-w-[240px]">
                               <audio controls className="w-full h-10" src={formatMediaUrl(msg.fileUrl)} />
                            </div>
                          )}

                          <p className="text-[13px] leading-relaxed font-medium whitespace-pre-wrap">
                            {msg.content?.replace(/\[AUDIO\]:? ?/, '🎙️ ')}
                          </p>
                          
                          <div className="flex justify-end items-center gap-1 mt-1">
                            <span className="text-[9px] text-slate-400 font-medium">
                              {timeString}
                            </span>
                            {msg.role !== 'user' && (
                               <span className="material-symbols-outlined text-[10px] text-primary">done_all</span>
                            )}
                          </div>
                        </div>

                        {/* Three dots button */}
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMessageMenu(
                                activeMessageMenu && activeMessageMenu.index === idx 
                                  ? null 
                                  : { index: idx, messageId: msg.id || msg.timestampRaw }
                              );
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200/50 flex items-center justify-center cursor-pointer flex-shrink-0"
                            title="Opciones"
                          >
                            <span className="material-symbols-outlined text-base">more_vert</span>
                          </button>

                          {activeMessageMenu && activeMessageMenu.index === idx && (
                            <div 
                              className={`absolute bg-white rounded-xl shadow-2xl border border-slate-100 py-1 z-50 min-w-[140px] animate-in fade-in zoom-in-95 duration-100 ${msg.role === 'user' ? 'left-0 mt-1' : 'right-0 mt-1'}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  onDeleteMessage && onDeleteMessage(selectedChat, activeMessageMenu.messageId);
                                  setActiveMessageMenu(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors text-[11px] font-bold text-red-500 flex items-center gap-2 uppercase tracking-wider"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                                Eliminar para mí
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            </div>

            <footer className="p-4 bg-white border-t border-slate-200">
               <div className="flex items-center gap-3">
                  <button className="text-slate-400 hover:text-slate-600 transition-colors">
                     <span className="material-symbols-outlined text-2xl">mood</span>
                  </button>
                  <button className="text-slate-400 hover:text-slate-600 transition-colors">
                     <span className="material-symbols-outlined text-2xl">attach_file</span>
                  </button>
                  <div className="flex-grow flex items-center bg-slate-100 rounded-full px-4 py-2 border border-transparent focus-within:border-slate-200 focus-within:bg-white transition-all">
                    <input 
                      className="w-full bg-transparent border-none text-sm text-slate-700 focus:ring-0 placeholder:text-slate-400" 
                      placeholder="Escribe un mensaje..." 
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                  </div>
                  <button 
                    onClick={handleSend}
                    className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md shadow-primary/20"
                  >
                    <span className="material-symbols-outlined text-xl">send</span>
                  </button>
               </div>
            </footer>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-12 relative overflow-hidden">
             <div className="whatsapp-pattern"></div>
             <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6 border border-slate-100 z-10">
                <span className="material-symbols-outlined text-4xl text-slate-200 font-thin">all_inbox</span>
             </div>
             <h3 className="text-xl font-bold text-slate-300 z-10">Selecciona un chat para comenzar</h3>
          </div>
        )}
      </section>

      {/* Right Sidebar - Info and Actions */}
      {selectedChat && activeChatData && (
        <section className={`transition-all duration-300 ease-in-out border-l border-slate-200 bg-white flex flex-col relative overflow-hidden ${
          showContactInfo ? 'w-full md:w-80 flex-shrink-0 visible opacity-100' : 'w-0 invisible opacity-0 border-none'
        }`}>
          <div className="p-8 flex flex-col items-center text-center border-b border-slate-50 relative">
            <button 
              onClick={() => setShowContactInfo(false)}
              className="md:hidden absolute top-4 left-4 w-10 h-10 flex items-center justify-center text-slate-500 rounded-full bg-slate-100 hover:bg-slate-200"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold mb-4">
               {activeChatData.customerName.charAt(0)}
            </div>
            <h2 className="font-bold text-lg text-slate-800 leading-tight">{activeChatData.customerName}</h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedChat}</p>
          </div>

          <div className="flex-grow overflow-y-auto p-6 space-y-8 custom-scrollbar">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
               <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary text-xl">shopping_cart</span>
                  <h4 className="font-bold text-sm text-slate-800">Venta Directa</h4>
               </div>
               
               <select 
                 value={selectedSaleAccount}
                 onChange={(e) => setSelectedSaleAccount(e.target.value)}
                 className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-xs font-semibold text-slate-700 mb-4 appearance-none cursor-pointer outline-none focus:border-primary/40"
               >
                 <option value="">Seleccionar cuenta...</option>
                 {availableInventory.map(acc => (
                   <option key={acc.id} value={acc.id}>
                     {acc.service} — ${acc.price}
                   </option>
                 ))}
               </select>

               <button 
                disabled={!selectedSaleAccount}
                onClick={handleSellToCustomer}
                className="w-full bg-primary text-white py-3.5 rounded-xl text-[11px] font-bold uppercase tracking-wider disabled:opacity-30 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
               >
                 Finalizar Venta
               </button>
            </div>

            <div>
              <h4 className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-4 px-2 flex items-center justify-between">
                Historial de Compras
                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">{customerSales.length}</span>
              </h4>
              <div className="space-y-4">
                {customerSales.length > 0 ? (
                  customerSales.map((sale, i) => (
                    <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                              <span className="material-symbols-outlined text-primary text-lg">local_mall</span>
                           </div>
                           <div>
                              <h5 className="text-[12px] font-bold text-slate-800 leading-tight">{sale.service}</h5>
                              <p className="text-[10px] text-slate-400 font-medium">{sale.date}</p>
                           </div>
                        </div>
                        <span className={`text-[11px] font-bold ${sale.paid ? 'text-tertiary' : 'text-orange-500 animate-pulse'}`}>
                          {sale.paid ? 'Vendido' : 'Pendiente de Pago'}
                        </span>
                      </div>
                      
                      <div className="space-y-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400 font-bold uppercase">Proveedor:</span>
                          <span className="text-primary font-bold uppercase tracking-widest">{sale.provider || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400 font-bold uppercase">Correo:</span>
                          <span className="text-slate-700 font-mono font-medium">{sale.email}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400 font-bold uppercase">Clave:</span>
                          <span className="text-slate-700 font-mono font-medium">{sale.pass}</span>
                        </div>
                        {sale.profile && (
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-400 font-bold uppercase">Perfil:</span>
                            <span className="text-slate-700 font-medium">{sale.profile} {sale.pin ? `(PIN: ${sale.pin})` : ''}</span>
                          </div>
                        )}
                        {sale.expiration && (
                          <div className="flex justify-between text-[10px] pt-1 border-t border-slate-200">
                            <span className="text-slate-400 font-bold uppercase">Vence:</span>
                            <span className="text-primary font-bold">{sale.expiration}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 opacity-30">
                    <span className="material-symbols-outlined text-4xl mb-2">history</span>
                    <p className="text-[10px] font-bold uppercase tracking-widest">Sin ventas previas</p>
                  </div>
                )}
              </div>
            </div>

            {/* Multimedia Gallery */}
            <div className="pt-4">
              <h4 className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-4 px-2 flex items-center justify-between">
                Archivos y Comprobantes
                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                  {activeChatData.messages.filter(m => m.imageUrl).length}
                </span>
              </h4>
              <div className="grid grid-cols-3 gap-2 px-1 pb-6">
                {activeChatData.messages
                  .filter(m => m.imageUrl)
                  .reverse()
                  .map((msg, i) => (
                    <div 
                      key={i} 
                      className="aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setFullscreenImage(formatMediaUrl(msg.imageUrl))}
                    >
                      <img 
                        src={formatMediaUrl(msg.imageUrl)} 
                        alt="Comprobante" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))
                }
                {activeChatData.messages.filter(m => m.imageUrl).length === 0 && (
                  <div className="col-span-3 py-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Sin multimedia</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50/50">
            <button 
              onClick={() => onDeleteChat && onDeleteChat(selectedChat)}
              className="w-full flex items-center justify-center gap-2 py-4 text-red-500 hover:text-white hover:bg-red-500 rounded-2xl border border-red-100 hover:border-red-500 transition-all font-black text-[11px] uppercase tracking-widest shadow-sm hover:shadow-xl hover:shadow-red-500/20 active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
              Eliminar Chat
            </button>
          </div>
        </section>
      )}

      {/* Lightbox Modal */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center cursor-zoom-out p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <button 
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur transition-all"
            onClick={(e) => { e.stopPropagation(); setFullscreenImage(null); }}
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
          <img 
            src={fullscreenImage} 
            alt="Imagen a pantalla completa" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default Simulator;
