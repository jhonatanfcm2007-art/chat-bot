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
      const nameMatch = (chat.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const fromMatch = (chat.from || '').toLowerCase().includes(searchTerm.toLowerCase());
      return nameMatch || fromMatch;
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

  const TAG_UI = {
    'pago-pendiente': { label: 'Pago Pendiente', classes: 'bg-[#FF9800]/10 text-[#EF6C00] border-[#FF9800]/20' },
    'pagado': { label: 'Pagado', classes: 'bg-tertiary/10 text-tertiary border-tertiary/20' },
    'inactivo': { label: 'Inactivo', classes: 'bg-on-surface-variant/10 text-on-surface-variant border-on-surface-variant/20' },
    'activo': { label: 'Activo', classes: 'bg-primary/10 text-primary border-primary/20' }
  };

  const getTagStyle = (tags) => {
    if (!tags || tags.length === 0) return TAG_UI['activo'];
    if (tags.includes('entregado') || tags.includes('pago-pendiente')) return TAG_UI['pago-pendiente'];
    if (tags.includes('pagado')) return TAG_UI['pagado'];
    if (tags.includes('inactivo')) return TAG_UI['inactivo'];
    return TAG_UI['activo'];
  };

  const getTagKey = (tags) => {
    if (!tags || tags.length === 0) return 'activo';
    if (tags.includes('entregado') || tags.includes('pago-pendiente')) return 'pago-pendiente';
    if (tags.includes('pagado')) return 'pagado';
    if (tags.includes('inactivo')) return 'inactivo';
    return 'activo';
  };

  return (
    <div className="flex flex-grow overflow-hidden relative font-sans bg-background">
      {/* 1. Chat List Sidebar (Left Column) */}
      <section className={`w-full md:w-80 flex-shrink-0 flex flex-col bg-[#0b0e14] relative z-10 border-r border-white/5 ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-8 pb-4 flex items-center justify-between">
          <h3 className="font-headline font-black text-2xl text-white tracking-tight">Messages</h3>
          <div className="w-10 h-10 text-white/40 rounded-xl flex items-center justify-center cursor-pointer hover:text-primary transition-all active:scale-90">
            <span className="material-symbols-outlined text-xl">edit_square</span>
          </div>
        </div>
        <div className="px-5 pb-5 border-b border-white/5">
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-sm group-focus-within:text-primary transition-colors">search</span>
            <input 
              className="w-full bg-[#111827] border border-white/5 rounded-xl py-3.5 pl-12 text-xs text-on-surface placeholder:text-white/20 focus:ring-1 focus:ring-primary/40 transition-all outline-none font-medium" 
              placeholder="Filter chats..." 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-grow overflow-y-auto custom-scrollbar py-4 px-4 pb-24 md:pb-4">
          {chatSessions.length > 0 ? (
            chatSessions.map((chat) => {
              const isSelected = selectedChat === chat.from;
              return (
                <div 
                  key={chat.from}
                  onClick={() => onSelectChat(chat.from)}
                  className={`flex gap-4 px-6 py-4 cursor-pointer transition-all relative group border-b border-white/5 ${
                    isSelected 
                      ? 'bg-white/10 border-l-2 border-l-primary shadow-inner shadow-black/20' 
                      : 'hover:bg-white/[0.02] border-l-2 border-l-transparent'
                  }`}
                >
                  {/* Profile box removed as requested earlier */}
                  <div className="flex-grow overflow-hidden flex flex-col justify-center">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className={`font-black truncate text-sm tracking-tight ${isSelected ? 'text-white' : 'text-on-surface'}`}>
                        {chat.customerName}
                      </h4>
                      <span className={`text-[10px] font-black ${isSelected ? 'text-primary' : 'text-white/20'}`}>
                        {chat.updatedAt && chat.updatedAt > 1000000 ? new Date(chat.updatedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {isSelected && <span className="material-symbols-outlined text-[12px] text-primary">key</span>}
                      <p className={`text-[11px] font-medium truncate opacity-60 ${isSelected ? 'text-white' : 'text-on-surface-variant'}`}>
                        {chat.lastMessage ? chat.lastMessage.content : 'No signals'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-20 text-center flex flex-col items-center gap-4">
               <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5 shadow-inner">
                  <span className="material-symbols-outlined text-4xl text-white/10 font-thin">all_inbox</span>
               </div>
               <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Archive Empty</p>
            </div>
          )}
        </div>
      </section>

      {/* 2. Main Chat Area (Middle Column) */}
      <section className={`flex-grow flex flex-col relative bg-background overflow-hidden ${selectedChat ? 'flex' : 'hidden md:flex'}`}>
        {activeChatData ? (
          <>
            <header className="h-24 flex items-center justify-between px-6 md:px-10 bg-[#020617]/80 border-b border-white/5 z-10 backdrop-blur-3xl">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => onSelectChat(null)}
                  className="md:hidden w-11 h-11 flex items-center justify-center text-on-surface-variant active:bg-white/5 rounded-2xl transition-all border border-white/5"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                {/* Profile box removed */}
                <div>
                  <h3 className="font-black text-on-surface text-lg md:text-xl leading-none tracking-tight">{activeChatData.customerName}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="bg-tertiary/10 border border-tertiary/20 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(45,212,191,0.1)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                      <p className="text-[9px] text-tertiary font-black uppercase tracking-[0.2em] leading-none">Agent Active</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="xl:hidden material-symbols-outlined text-on-surface-variant p-2.5 cursor-pointer hover:bg-white/5 hover:text-on-surface rounded-2xl transition-all border border-white/5">info</span>
              </div>
            </header>

            <div className="flex-grow p-6 md:p-10 overflow-y-auto space-y-8 flex flex-col custom-scrollbar cube-pattern pb-32 md:pb-10 relative">
              {/* Background Glow */}
              <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[180px] -z-10 animate-pulse"></div>

              <div className="flex justify-center mb-4">
                <span className="px-5 py-1.5 rounded-full text-[10px] font-black text-white/40 uppercase tracking-[0.3em] border border-white/5 bg-[#111827]/80 backdrop-blur-md">Today</span>
              </div>

              {activeChatData.messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-start' : 'items-end'}`}>
                  <div className={`max-w-[85%] md:max-w-[65%] transition-all relative ${
                    msg.role === 'user' 
                      ? 'bg-chat-bubble-user text-white border border-white/10 rounded-bl-none shadow-xl' 
                      : 'bg-gradient-to-br from-chat-bubble-agent-start to-chat-bubble-agent-end text-white shadow-xl shadow-indigo-500/10 rounded-br-none'
                  } ${msg.imageUrl ? 'p-1' : 'px-6 py-4 rounded-[1.5rem]'}`}>
                    {msg.imageUrl ? (
                      <div className="rounded-[1.2rem] overflow-hidden">
                        <img 
                          src={msg.imageUrl.startsWith('http') ? msg.imageUrl : `${window.location.protocol}//${window.location.host}${msg.imageUrl}`} 
                          alt="Message attachment" 
                          className="max-w-full h-auto object-cover hover:scale-105 transition-transform cursor-pointer"
                          onClick={() => window.open(msg.imageUrl.startsWith('http') ? msg.imageUrl : `${window.location.protocol}//${window.location.host}${msg.imageUrl}`, '_blank')}
                        />
                      </div>
                    ) : (
                      <p className="text-[13px] md:text-[14px] leading-relaxed font-medium tracking-wide">{msg.content}</p>
                    )}
                    
                    <div className={`flex items-center gap-2 mt-2 ${msg.imageUrl ? 'px-4 pb-2' : ''} ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <span className={`text-[8px] font-black uppercase tracking-0.15em ${msg.role === 'user' ? 'opacity-30' : 'opacity-60'}`}>
                        {msg.timestamp || msg.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              

              <div ref={chatEndRef} />
            </div>

            <footer className="p-6 md:p-8 bg-surface/80 border-t border-white/5 pb-safe-area-inset-bottom backdrop-blur-md">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/5 hover:border-primary/20 transition-all focus-within:border-primary/20"
              >
                <input 
                  className="flex-grow bg-transparent border-none text-sm text-on-surface focus:ring-0 placeholder:text-on-surface-variant font-medium" 
                  placeholder="Intercept frequency..." 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  type="text"
                />
                <button 
                  type="submit"
                  className="w-12 h-12 bg-primary text-on-primary rounded-xl flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-lg shadow-primary/20"
                >
                  <span className="material-symbols-outlined text-xl">send</span>
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-12 relative overflow-hidden">
             <div className="absolute w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px]"></div>
             <span className="material-symbols-outlined text-8xl font-thin mb-8 text-white/5 relative">waves</span>
             <h3 className="text-2xl font-black text-white/20 tracking-[0.2em] relative">SELECT SIGNAL</h3>
             <p className="text-[10px] font-black uppercase tracking-[0.4em] mt-4 text-white/5 relative">Awaiting decryption</p>
          </div>
        )}
      </section>

      {/* 3. Customer Profile & CRM Actions Sidebar (Right Column) */}
      {selectedChat && activeChatData && (
        <section className={`w-85 flex-shrink-0 bg-[#0b0e14] border-l border-white/5 hidden xl:flex flex-col z-20 shadow-[-10px_0_40px_rgba(0,0,0,0.4)] overflow-hidden`}>
          <div className="p-10 flex flex-col items-center text-center border-b border-white/5 sticky top-0 bg-[#0b0e14]/80 z-10 backdrop-blur-3xl">
            {/* Profile box removed */}
            <h2 className="font-black text-2xl text-on-surface tracking-tight leading-none mb-2">{activeChatData.customerName}</h2>
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-30">{selectedChat}</p>
          </div>

          <div className="flex-grow overflow-y-auto p-8 space-y-10 custom-scrollbar">
            {/* Status Field */}
            <div>
              <h4 className="text-[10px] uppercase tracking-[0.3em] font-black text-on-surface-variant mb-5 opacity-40">Classification</h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(TAG_UI).map(([key, style]) => (
                  <button 
                    key={key}
                    onClick={() => onUpdateTag(selectedChat, [key])}
                    className={`py-3 px-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                      getTagKey(activeChatData.tags) === key 
                        ? style.classes + ' shadow-[0_0_15px_rgba(45,212,191,0.1)] border-current scale-105' 
                        : 'bg-white/5 border-transparent text-white/20 hover:bg-white/10 hover:text-white/60'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Forge (Sales) */}
            <div className="bg-white/[0.02] rounded-[2rem] p-6 border border-white/5 shadow-inner">
               <div className="flex items-center gap-3 mb-6">
                 <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-lg">bolt</span>
                 </div>
                 <h4 className="font-black text-sm text-white tracking-tight">Direct Dispatch</h4>
               </div>
               
               <select 
                 value={selectedSaleAccount}
                 onChange={(e) => setSelectedSaleAccount(e.target.value)}
                 className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-xs font-bold text-white focus:ring-2 focus:ring-primary/20 mb-4 appearance-none cursor-pointer"
               >
                 <option value="" className="bg-panel-bg">Select asset...</option>
                 {availableInventory.map(acc => (
                   <option key={acc.id} value={acc.id} className="bg-panel-bg">
                     {acc.service} ({acc.profile || 'Acc'}) — ${acc.price}
                   </option>
                 ))}
               </select>

               <button 
                disabled={!selectedSaleAccount}
                onClick={handleSellToCustomer}
                className="w-full bg-primary text-on-primary py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] disabled:opacity-20 transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-primary/20"
               >
                 Finalize Sale
               </button>
            </div>

            {/* Deployment History */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-[10px] uppercase tracking-[0.3em] font-black text-on-surface-variant opacity-40">Deployment Records</h4>
                <span className="bg-white/5 border border-white/5 text-white/40 px-3 py-1 rounded-lg text-[10px] font-black flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">history</span>
                  {customerSales.length}
                </span>
              </div>

              {customerSales.length > 0 ? (
                <div className="space-y-4">
                  {customerSales.map(sale => (
                    <div key={sale.id} className="bg-white/5 border border-white/5 rounded-2xl p-5 flex gap-4 items-center group hover:bg-white/10 transition-all cursor-default">
                       <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/20 group-hover:text-primary transition-all duration-500">
                         <span className="material-symbols-outlined text-xl font-light">package_2</span>
                       </div>
                       <div className="flex-grow">
                         <h5 className="font-black text-sm text-white leading-tight tracking-tight">{sale.service}</h5>
                         <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mt-1 opacity-40">
                           {sale.dateOut || sale.date}
                         </p>
                       </div>
                       <div className="flex flex-col items-end">
                         <span className="font-black text-primary text-sm tracking-tighter">${sale.price}</span>
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-white/[0.01] rounded-3xl border border-white/5 border-dashed">
                  <span className="material-symbols-outlined text-white/5 text-4xl mb-2 font-thin">history_toggle_off</span>
                  <p className="text-[10px] font-black text-white/10 uppercase tracking-widest">No operations recorded</p>
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
