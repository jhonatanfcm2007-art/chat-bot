import React, { useState, useEffect, useRef } from 'react';

const Simulator = ({ chats, selectedChat, onSelectChat, onSendMessage, accounts = [], salesHistory = [], onSale, onUpdateTag }) => {
  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSaleAccount, setSelectedSaleAccount] = useState('');
  
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats, selectedChat]);

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

  const activeChatData = selectedChat ? chats[selectedChat] : null;
  
  const chatArray = Object.entries(chats);
  const chatSessions = chatArray
    .map(([id, data], index) => {
      const messages = data.messages || [];
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      
      let activityTime = data.updatedAt;
      if (!activityTime && lastMessage) {
         activityTime = lastMessage.timestampRaw;
         if (!activityTime && lastMessage.timestamp) {
            activityTime = parseTimeString(lastMessage.timestamp);
         }
      }
      if (!activityTime) activityTime = index;
      
      return {
        ...data,
        customerName: data.customerName || 'Cliente sin nombre',
        from: data.from || id,
        tags: data.tags || ['activo'],
        updatedAt: activityTime,
        lastMessage: lastMessage
      };
    })
    .filter(chat => {
      const nameMatch = (chat.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const fromMatch = (chat.from || '').toLowerCase().includes(searchTerm.toLowerCase());
      return nameMatch || fromMatch;
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const customerSales = salesHistory.filter(sale => sale.customerId === selectedChat);
  const availableInventory = accounts.filter(acc => acc.status === 'Available' || parseInt(acc.uses) > 0);

  const handleSellToCustomer = () => {
    if (!selectedSaleAccount) return;
    const accountToSell = availableInventory.find(a => a.id === selectedSaleAccount);
    if (accountToSell) {
      if(window.confirm(`¿Confirmas la venta de ${accountToSell.service} por $${accountToSell.price}? Se descontará del inventario.`)){
        // 1. Registrar la venta y actualizar inventario
        onSale(accountToSell, selectedChat, activeChatData.customerName);
        setSelectedSaleAccount('');
        
        // 2. Autocambiar el estado del cliente a pagado
        onUpdateTag(selectedChat, ['pagado']);

        // 3. Generar y enviar el mensaje con los datos de cuenta automáticamente
        const messageHeader = `🎉 ¡Gracias por tu compra de *${accountToSell.service}*!`;
        const accountDetails = `*Correo:* ${accountToSell.email}\n*Contraseña:* ${accountToSell.password}`;
        
        let profileDetails = '';
        if (accountToSell.profileName || accountToSell.pin) {
          profileDetails = `\n*Perfil:* ${accountToSell.profileName || 'Principal'}`;
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

  const TAG_UI = {
    'pago-pendiente': { label: 'Pago Pendiente', classes: 'bg-[#FF9800]/10 text-[#EF6C00] border-[#FF9800]/20' },
    'pagado': { label: 'Pagado', classes: 'bg-tertiary/10 text-tertiary border-tertiary/20' },
    'inactivo': { label: 'Inactivo', classes: 'bg-on-surface-variant/10 text-on-surface-variant border-on-surface-variant/20' },
    'activo': { label: 'Activo', classes: 'bg-primary/10 text-primary border-primary/20' }
  };

  const getTagStyle = (tags) => {
    if (!tags || tags.length === 0) return TAG_UI['activo'];
    // Prioridad: 1. pago-pendiente, 2. pagado, 3. inactivo, 4. activo
    if (tags.includes('pago-pendiente')) return TAG_UI['pago-pendiente'];
    if (tags.includes('pagado')) return TAG_UI['pagado'];
    if (tags.includes('inactivo')) return TAG_UI['inactivo'];
    return TAG_UI['activo'];
  };

  const getTagKey = (tags) => {
    if (!tags || tags.length === 0) return 'activo';
    if (tags.includes('pago-pendiente')) return 'pago-pendiente';
    if (tags.includes('pagado')) return 'pagado';
    if (tags.includes('inactivo')) return 'inactivo';
    return 'activo';
  };

  return (
    <div className="flex flex-grow overflow-hidden relative font-sans">
      {/* 1. Chat List Sidebar (Left Column) */}
      <section className={`w-full md:w-80 flex-shrink-0 flex flex-col bg-panel-bg relative z-10 border-r border-outline-variant/10 ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <h3 className="font-headline font-black text-xl text-white tracking-tight">Chats</h3>
          <div className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center cursor-pointer hover:bg-primary transition-all shadow-sm">
            <span className="material-symbols-outlined text-xl">filter_list</span>
          </div>
        </div>
        <div className="p-4 border-b border-white/5 bg-white/5">
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm group-focus-within:text-primary transition-colors">search</span>
            <input 
              className="w-full bg-white/10 border border-white/5 rounded-xl py-2.5 pl-11 text-xs text-white placeholder:text-white/20 focus:ring-2 focus:ring-primary/40 focus:bg-white/15 transition-all outline-none" 
              placeholder="Buscar cliente..." 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-grow overflow-y-auto scrollbar-hide py-3 px-3 pb-24 md:pb-3">
          {chatSessions.length > 0 ? (
            chatSessions.map((chat) => {
              const mainTag = getTagStyle(chat.tags);
              return (
                <div 
                  key={chat.from}
                  onClick={() => onSelectChat(chat.from)}
                  className={`flex gap-3 px-3 py-4 rounded-2xl cursor-pointer transition-all relative group mb-2 ${
                    selectedChat === chat.from ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' : 'hover:bg-white/5 text-panel-on-bg/60'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg transition-all duration-500 shadow-sm ${
                      selectedChat === chat.from ? 'bg-white text-primary' : 'bg-white/10 text-white group-hover:bg-white/20'
                    }`}>
                      {chat.customerName.charAt(0)}
                    </div>
                  </div>
                  <div className="flex-grow overflow-hidden flex flex-col justify-center">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className={`font-bold truncate text-[13px] tracking-tight ${selectedChat === chat.from ? 'text-white' : 'text-white/90'}`}>
                        {chat.customerName}
                      </h4>
                      <span className={`text-[8px] font-black uppercase tracking-[0.1em] ${selectedChat === chat.from ? 'text-white/60' : 'text-white/20'}`}>
                        {chat.updatedAt && chat.updatedAt > 1000000 ? new Date(chat.updatedAt).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' }) : '---'}
                      </span>
                    </div>
                    
                    {/* Last Message Preview */}
                    <p className={`text-[10px] truncate max-w-[140px] mb-1 ${selectedChat === chat.from ? 'text-white/70' : 'text-white/30'}`}>
                      {chat.lastMessage ? chat.lastMessage.content : 'Sin mensajes'}
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                       <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                         selectedChat === chat.from ? 'bg-white/20 border-white/30 text-white' : mainTag.classes
                       }`}>
                         {mainTag.label}
                       </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center flex flex-col items-center opacity-10">
               <span className="material-symbols-outlined text-5xl mb-4 text-white">inbox</span>
               <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white">Bandeja vacía</p>
            </div>
          )}
        </div>
      </section>

      {/* 2. Main Chat Area (Middle Column) */}
      <section className={`flex-grow flex flex-col relative bg-background overflow-hidden ${selectedChat ? 'flex' : 'hidden md:flex'}`}>
        {activeChatData ? (
          <>
            <header className="h-20 flex items-center justify-between px-4 md:px-8 bg-white border-b border-outline-variant z-10 shadow-sm">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => onSelectChat(null)}
                  className="md:hidden w-10 h-10 flex items-center justify-center text-on-surface-variant active:bg-secondary-bg rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined">arrow_back_ios_new</span>
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center font-black shadow-lg shadow-primary/20">
                    {activeChatData.customerName.charAt(0)}
                  </div>
                </div>
                <div>
                  <h3 className="font-black text-on-surface text-base md:text-lg leading-none tracking-tight">{activeChatData.customerName}</h3>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="w-1.5 h-1.5 bg-tertiary rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    <p className="text-[9px] text-tertiary font-black uppercase tracking-widest">Bot Atendiendo</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Visualizer for mobile regarding profile */}
                <span className="xl:hidden material-symbols-outlined text-on-surface-variant p-2 cursor-pointer hover:bg-secondary-bg rounded-full">info</span>
              </div>
            </header>

            <div className="flex-grow p-4 md:p-8 overflow-y-auto space-y-6 flex flex-col scrollbar-hide bg-[#f8fbff] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-20 pb-24 md:pb-8">
              <div className="flex justify-center mb-2">
                <span className="bg-white px-5 py-1.5 rounded-2xl text-[8px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] border border-outline-variant shadow-sm">Hoy</span>
              </div>

              {activeChatData.messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-start' : 'items-end'}`}>
                  <div className={`max-w-[85%] md:max-w-[70%] px-5 py-3.5 rounded-2xl shadow-sm transition-all ${
                    msg.role === 'user' 
                      ? 'bg-white text-on-surface border border-outline-variant rounded-bl-none' 
                      : 'bg-primary text-white shadow-xl shadow-primary/10 rounded-br-none'
                  }`}>
                    <p className="text-[13px] md:text-[14px] leading-relaxed font-medium">{msg.content}</p>
                    <div className={`flex items-center gap-2 mt-2 ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <span className={`text-[8px] font-black uppercase tracking-[0.15em] ${msg.role === 'user' ? 'opacity-30' : 'opacity-60'}`}>
                        {msg.timestamp || msg.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <footer className="p-4 bg-white border-t border-outline-variant pb-safe-area-inset-bottom">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-3 bg-secondary-bg px-4 py-2 rounded-2xl border border-outline-variant"
              >
                <input 
                  className="flex-grow bg-transparent border-none text-sm text-on-surface focus:ring-0" 
                  placeholder="Escribe para intervenir..." 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  type="text"
                />
                <button 
                  type="submit"
                  className="w-10 h-10 bg-on-surface text-white rounded-xl flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-md"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-12 opacity-40">
            <span className="material-symbols-outlined text-7xl font-thin mb-4">forum</span>
            <h3 className="text-xl font-black text-on-surface">Selecciona un chat</h3>
            <p className="text-sm font-medium">Elige una conversación para atender.</p>
          </div>
        )}
      </section>

      {/* 3. Customer Profile & CRM Actions Sidebar (Right Column) */}
      {selectedChat && activeChatData && (
        <section className={`w-80 flex-shrink-0 bg-white border-l border-outline-variant hidden xl:flex flex-col z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]`}>
          <div className="p-8 flex flex-col items-center text-center border-b border-outline-variant">
            <div className="w-24 h-24 rounded-[2rem] bg-secondary-bg text-on-surface flex items-center justify-center font-black text-4xl shadow-inner border border-outline-variant mb-4 relative">
              {activeChatData.customerName.charAt(0)}
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white bg-tertiary flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-white text-[14px]">phone_iphone</span>
              </div>
            </div>
            <h2 className="font-black text-xl text-on-surface tracking-tight leading-5">{activeChatData.customerName}</h2>
            <p className="text-xs font-bold text-on-surface-variant opacity-60 mt-1">{selectedChat}</p>
          </div>

          <div className="flex-grow overflow-y-auto p-6 space-y-8 scrollbar-hide">
            {/* Tag Selection Matrix */}
            <div>
              <h4 className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant/50 mb-3">Estado del Cliente</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(TAG_UI).map(([key, style]) => (
                  <button 
                    key={key}
                    onClick={() => onUpdateTag(selectedChat, [key])}
                    className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                      getTagKey(activeChatData.tags) === key 
                        ? style.classes + ' shadow-sm ring-1 ring-offset-1 ' + (key === 'pago-pendiente' ? 'ring-[#FF9800]' : key === 'pagado' ? 'ring-tertiary' : 'ring-primary')
                        : 'bg-white border-outline-variant text-on-surface-variant hover:bg-secondary-bg'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Sale Module */}
            <div className="bg-secondary-bg rounded-3xl p-5 border border-outline-variant shadow-inner">
               <div className="flex items-center gap-2 mb-4">
                 <span className="material-symbols-outlined text-primary text-lg">shopping_cart_checkout</span>
                 <h4 className="font-black text-sm text-on-surface tracking-tight">Vender Directo</h4>
               </div>
               
               <select 
                 value={selectedSaleAccount}
                 onChange={(e) => setSelectedSaleAccount(e.target.value)}
                 className="w-full bg-white border border-outline-variant rounded-xl py-3 px-3 text-xs font-bold text-on-surface focus:ring-2 focus:ring-primary/20 mb-3"
               >
                 <option value="">Seleccionar producto...</option>
                 {availableInventory.map(acc => (
                   <option key={acc.id} value={acc.id}>
                     {acc.service} ({acc.profile || acc.email}) - ${acc.price}
                   </option>
                 ))}
               </select>

               <button 
                disabled={!selectedSaleAccount}
                onClick={handleSellToCustomer}
                className="w-full bg-on-surface text-white py-3 rounded-xl text-[11px] font-black uppercase tracking-widest disabled:opacity-30 transition-all hover:bg-on-surface/90 shadow-lg shadow-on-surface/10"
               >
                 Confirmar Venta
               </button>
            </div>

            {/* Purchase History */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant/50">Historial</h4>
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded pl-1.5 text-[9px] font-black flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">local_mall</span>
                  {customerSales.length}
                </span>
              </div>

              {customerSales.length > 0 ? (
                <div className="space-y-3">
                  {customerSales.map(sale => (
                    <div key={sale.id} className="bg-white border border-outline-variant rounded-2xl p-4 flex gap-4 items-center shadow-sm">
                       <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 flex-shrink-0">
                         <span className="material-symbols-outlined text-lg">movie</span>
                       </div>
                       <div>
                         <h5 className="font-bold text-sm text-on-surface leading-tight">{sale.service}</h5>
                         <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mt-1 opacity-60">
                           {sale.dateOut || sale.date}
                         </p>
                       </div>
                       <div className="ml-auto flex flex-col items-end">
                         <span className="font-black text-tertiary text-sm">${sale.price}</span>
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-secondary-bg rounded-2xl border border-outline-variant border-dashed">
                  <span className="material-symbols-outlined text-on-surface-variant opacity-30 text-3xl mb-1">sentiment_dissatisfied</span>
                  <p className="text-xs font-bold text-on-surface-variant">Sin compras aún</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Simulator;
