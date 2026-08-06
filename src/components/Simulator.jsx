import React, { useState, useEffect, useRef } from 'react';
import KanbanBoard from './KanbanBoard';
import DropiUploadModal from './DropiUploadModal';

const Simulator = ({ chats, selectedChat, onSelectChat, onSendMessage, accounts = [], salesHistory = [], onSale, onUpdateTag, onDeleteChat, onDeleteMessage, onBulkClearTags, onToggleAI, onToggleBlock, serverUrl, globalLine, onSendTrackingManual, onConfirmBulkTracking }) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const fileInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSaleAccount, setSelectedSaleAccount] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [showContactInfo, setShowContactInfo] = useState(false);
  
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [filterProduct, setFilterProduct] = useState('all');
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(false);
  const [filterCountry, setFilterCountry] = useState('all');
  const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);
  const [openTagMenu, setOpenTagMenu] = useState(null);
  const [activeMessageMenu, setActiveMessageMenu] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [showKanban, setShowKanban] = useState(false);
  const [showDropiModal, setShowDropiModal] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [visibleChatsCount, setVisibleChatsCount] = useState(50);
  const chatEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const prevSelectedChatRef = useRef(selectedChat);
  const prevChatsLengthRef = useRef(0);

  const TAG_UI = {
    'pagado': { label: 'Pagado', color: '#10B981', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/60' },
    'pago-pendiente': { label: 'Pago Pendiente', color: '#F59E0B', classes: 'bg-amber-50 text-amber-700 border-amber-200/60' },
    'soporte': { label: 'Soporte', color: '#64748B', classes: 'bg-slate-50 text-slate-600 border-slate-200/60' },
    'interesado': { label: 'Interesado', color: '#6C5CE7', classes: 'bg-primary-light text-primary border-primary/20' },
    'preparar_pedido': { label: 'Preparar Pedido', color: '#0EA5E9', classes: 'bg-sky-50 text-sky-600 border-sky-200/60' },
    'guia_enviada': { label: 'Guía Enviada', color: '#8B5CF6', classes: 'bg-violet-50 text-violet-600 border-violet-200/60' },
    'viajando_destino': { label: 'Viajando a Destino', color: '#3B82F6', classes: 'bg-blue-50 text-blue-600 border-blue-200/60' },
    'en_ruta': { label: 'En Ruta de Entrega', color: '#F97316', classes: 'bg-orange-50 text-orange-600 border-orange-200/60' },
    'entregado': { label: 'Entregado', color: '#14B8A6', classes: 'bg-teal-50 text-teal-600 border-teal-200/60' },
    'novedad': { label: 'Novedades', color: '#EF4444', classes: 'bg-red-50 text-red-600 border-red-200/60' },
    'pedidos_abandonados': { label: 'Pedido Abandonado', color: '#6B7280', classes: 'bg-gray-100 text-gray-700 border-gray-300' }
  };
  
  const currentChatForScroll = selectedChat && chats[selectedChat] 
    ? chats[selectedChat] 
    : { messages: [], name: 'Selecciona un chat', phone: '', tags: [] };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const isChatSwitch = prevSelectedChatRef.current !== selectedChat;
    const currentMessagesLength = currentChatForScroll?.messages?.length || 0;
    const hasNewMessage = currentMessagesLength > prevChatsLengthRef.current;
    
    if (isChatSwitch) {
      setTimeout(scrollToBottom, 50);
    } else if (hasNewMessage && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const distanceToBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      
      if (distanceToBottom < 250) {
        scrollToBottom();
      }
    }
    
    prevSelectedChatRef.current = selectedChat;
    prevChatsLengthRef.current = currentMessagesLength;
  }, [chats, selectedChat, currentChatForScroll.messages.length]);

  const handleAudit = async () => {
    const time = window.prompt("¿Qué chats deseas auditar? Escribe 'hoy' o 'ayer':", "hoy");
    if (time !== 'hoy' && time !== 'ayer') return;

    setIsAuditing(true);
    try {
      const response = await fetch(`${serverUrl}/api/scan-chats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframe: time })
      });
      const data = await response.json();
      if (data.success) {
        alert(`Auditoría Completada.\nChats analizados: ${data.scanned}\nPedidos recuperados: ${data.recovered}\nTotal de pedidos de ${time}: ${data.total}`);
      } else {
        alert('Error en auditoría: ' + data.error);
      }
    } catch (e) {
      alert('Error de conexión.');
    }
    setIsAuditing(false);
  };

  useEffect(() => {
    const handleCloseMenu = () => {
      setOpenTagMenu(null);
      setIsFilterMenuOpen(false);
      setIsProductMenuOpen(false);
      setIsCountryMenuOpen(false);
      setActiveMessageMenu(null);
    };
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  useEffect(() => {
    setSelectedFile(null);
    setFilePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [selectedChat]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Solo se pueden enviar imágenes');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedFile(file);
      setFilePreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if ((!inputValue.trim() && !filePreview) || !selectedChat) return;
    
    let uploadedImageUrl = null;
    
    if (filePreview) {
      try {
        const response = await fetch(`${serverUrl}/api/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: selectedFile.name,
            base64: filePreview
          })
        });
        if (response.ok) {
          const data = await response.json();
          uploadedImageUrl = data.url;
        } else {
          alert('Error al subir la imagen');
          return;
        }
      } catch (err) {
        console.error('Error uploading image:', err);
        alert('Error de conexión al subir la imagen');
        return;
      }
    }
    
    onSendMessage({ 
      to: selectedChat, 
      content: inputValue, 
      imageUrl: uploadedImageUrl,
      origin: window.location.origin
    });
    
    setInputValue('');
    setSelectedFile(null);
    setFilePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
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
  
  const [kbProducts, setKbProducts] = useState([]);
  
  useEffect(() => {
    fetch(`${serverUrl}/api/knowledge-base`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setKbProducts(data.map(p => p.name.trim()));
        }
      })
      .catch(err => console.error("Error fetching knowledge base for simulator:", err));
  }, [serverUrl]);

  const uniqueProducts = Array.from(new Set([
    ...Object.values(chats).map(c => c.assignedProduct?.trim()).filter(Boolean),
    ...kbProducts
  ])).sort();

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
      
      const lineMatch = globalLine === 'all' || chat.waLine === globalLine;
      const productMatch = filterProduct === 'all' || chat.assignedProduct?.trim() === filterProduct;
      
      const chatPhone = String(chat.from).replace('+', '').trim();
      const countryMatch = filterCountry === 'all' || chatPhone.startsWith(filterCountry);
      
      return searchMatch && tagMatch && lineMatch && productMatch && countryMatch;
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
    if (!tags || tags.length === 0) return { label: 'Sin asignar', classes: 'bg-slate-50 text-slate-400 border-slate-200' };
    const key = tags[0];
    return TAG_UI[key] || { label: 'Sin asignar', classes: 'bg-slate-50 text-slate-400 border-slate-200' };
  };

  const getTagKey = (tags) => {
    return (tags && tags.length > 0) ? tags[0] : 'sin-asignar';
  };

  return (
    <div className="flex flex-grow overflow-hidden relative font-sans bg-background">
      {/* 1. Chat List Sidebar (Left Column) */}
      <section className={`w-full md:w-[400px] flex-shrink-0 flex flex-col bg-white overflow-hidden relative z-10 border-r border-outline-variant ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-5 pb-2">
          <div className="flex items-center justify-between mb-4">
             <div className="relative flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsFilterMenuOpen(!isFilterMenuOpen); setIsProductMenuOpen(false); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filterTag !== 'all' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  <span className="material-symbols-outlined text-sm">{filterTag !== 'all' ? 'filter_list_off' : 'filter_list'}</span>
                  {filterTag !== 'all' ? TAG_UI[filterTag]?.label : 'Filtrar'}
                </button>

                <button 
                  onClick={(e) => { e.stopPropagation(); setIsProductMenuOpen(!isProductMenuOpen); setIsFilterMenuOpen(false); setIsCountryMenuOpen(false); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filterProduct !== 'all' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  <span className="material-symbols-outlined text-sm">{filterProduct !== 'all' ? 'inventory_2' : 'inventory'}</span>
                  {filterProduct !== 'all' ? filterProduct : 'Producto'}
                </button>

                <button 
                  onClick={(e) => { e.stopPropagation(); setIsCountryMenuOpen(!isCountryMenuOpen); setIsFilterMenuOpen(false); setIsProductMenuOpen(false); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${filterCountry !== 'all' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  <span className="material-symbols-outlined text-sm">{filterCountry !== 'all' ? 'public' : 'public'}</span>
                  {filterCountry !== 'all' ? (filterCountry === '503' ? 'El Salvador' : filterCountry === '504' ? 'Honduras' : filterCountry === '502' ? 'Guatemala' : filterCountry === '56' ? 'Chile' : filterCountry) : 'País'}
                </button>

                {/* PRODUCT MENU */}
                {isProductMenuOpen && (
                  <div className="absolute top-full left-10 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-200 z-[100] py-1 overflow-hidden">
                    <div 
                      className={`px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-3 ${filterProduct === 'all' ? 'bg-primary-light' : ''}`}
                      onClick={() => { setFilterProduct('all'); setIsProductMenuOpen(false); }}
                    >
                      <span className="material-symbols-outlined text-sm text-slate-400">all_inclusive</span>
                      <span className="text-xs font-medium text-slate-600">Todos los Productos</span>
                    </div>
                    {uniqueProducts.map((prod) => (
                      <div 
                        key={prod}
                        className={`px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-3 ${filterProduct === prod ? 'bg-primary-light' : ''}`}
                        onClick={() => { setFilterProduct(prod); setIsProductMenuOpen(false); }}
                      >
                        <span className="material-symbols-outlined text-sm text-primary">inventory_2</span>
                        <span className="text-xs font-medium text-slate-600 truncate">{prod}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button 
                  onClick={() => setShowKanban(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors border border-indigo-200"
                >
                  <span className="material-symbols-outlined text-sm">view_kanban</span>
                  Tablero Logístico
                </button>

                {/* COUNTRY MENU */}
                {isCountryMenuOpen && (
                  <div className="absolute top-full left-32 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 z-[100] py-1 overflow-hidden">
                    <div 
                      className={`px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-3 ${filterCountry === 'all' ? 'bg-emerald-50' : ''}`}
                      onClick={() => { setFilterCountry('all'); setIsCountryMenuOpen(false); }}
                    >
                      <span className="material-symbols-outlined text-sm text-slate-400">public</span>
                      <span className="text-xs font-medium text-slate-600">Todos los Países</span>
                    </div>
                    {[{ code: '503', name: 'El Salvador' }, { code: '504', name: 'Honduras' }, { code: '502', name: 'Guatemala' }, { code: '56', name: 'Chile' }].map((country) => (
                      <div 
                        key={country.code}
                        onClick={() => { setFilterCountry(country.code); setIsCountryMenuOpen(false); }}
                        className={`px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-3 ${filterCountry === country.code ? 'bg-emerald-50' : ''}`}
                      >
                        <span className="material-symbols-outlined text-emerald-500 text-[18px]">location_on</span>
                        <span className="text-[13px] font-medium text-slate-700">{country.name} (+{country.code})</span>
                      </div>
                    ))}
                  </div>
                )}


                {isFilterMenuOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 z-[100] py-1 overflow-hidden">
                    <div 
                      className={`px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-3 ${filterTag === 'all' ? 'bg-primary-light' : ''}`}
                      onClick={() => { setFilterTag('all'); setIsFilterMenuOpen(false); }}
                    >
                      <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                      <span className="text-xs font-medium text-slate-600">Ver Todos</span>
                    </div>
                    {Object.entries(TAG_UI).map(([key, style]) => (
                      <div 
                        key={key}
                        className={`px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-3 ${filterTag === key ? 'bg-primary-light' : ''}`}
                        onClick={() => { setFilterTag(key); setIsFilterMenuOpen(false); }}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: style.color }}></div>
                        <span className="text-xs font-medium text-slate-600">{style.label}</span>
                      </div>
                    ))}
                    
                    {filterTag !== 'all' && chatSessions.length > 0 && (
                      <div 
                        className="mt-1 pt-1 border-t border-slate-100 px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-3 text-slate-500"
                        onClick={() => {
                          onBulkClearTags(chatSessions.map(c => c.from));
                          setIsFilterMenuOpen(false);
                          setFilterTag('all');
                        }}
                      >
                        <span className="material-symbols-outlined text-lg">label_off</span>
                        <span className="text-xs font-medium">Quitar Etiquetas ({chatSessions.length})</span>
                      </div>
                    )}
                  </div>
                )}
             </div>
             
             <div className="flex items-center gap-3 text-slate-400">
                {filterTag !== 'all' && (
                  <span className="text-xs font-medium bg-primary-light text-primary px-2 py-0.5 rounded-md">
                    {chatSessions.length} Resultados
                  </span>
                )}
             </div>
          </div>
          

          
          <div className="relative mb-4">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input 
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none" 
              placeholder="Buscar contacto..." 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar">
          {chatSessions.length > 0 ? (
            <>
            {chatSessions.slice(0, visibleChatsCount).map((chat) => {
              const isSelected = selectedChat === chat.from;
              return (
                <div 
                  key={chat.from}
                  onClick={() => onSelectChat(chat.from)}
                  className={`flex gap-3 px-5 py-3.5 cursor-pointer transition-colors relative border-b border-slate-100/60 ${
                    isSelected 
                      ? 'bg-primary-light' 
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-slate-500 font-semibold text-sm border-2 border-white shadow-sm overflow-visible relative">
                    {chat.imageUrl ? (
                      <img src={chat.imageUrl} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      chat.customerName ? chat.customerName.charAt(0).toUpperCase() : '?'
                    )}
                    {chat.waLine && (
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white border-2 border-white shadow-sm ${chat.waLine === 2 ? 'bg-tertiary' : 'bg-slate-400'}`}>
                        L{chat.waLine}
                      </div>
                    )}
                  </div>
                  <div className="flex-grow overflow-hidden flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className={`font-semibold truncate text-sm ${isSelected ? 'text-on-surface' : 'text-slate-700'} flex items-center gap-1`}>
                        {chat.isBlocked && <span className="material-symbols-outlined text-xs text-red-500 font-bold">block</span>}
                        {chat.customerName}
                      </h4>
                      <div className="flex items-center gap-2">
                        <div 
                           className={`w-[110px] py-0.5 rounded-md text-xs font-medium border transition-colors cursor-pointer flex items-center justify-center gap-1 ${getTagStyle(chat.tags).classes}`}
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
                           <span className="material-symbols-outlined text-xs">expand_more</span>
                        </div>

                        {openTagMenu && openTagMenu.from === chat.from && (
                           <div 
                              className="fixed w-48 bg-white rounded-xl shadow-2xl border border-slate-200 z-[999] py-1"
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
                                    <span className="text-xs font-medium text-slate-600">{style.label}</span>
                                 </div>
                              ))}
                           </div>
                        )}

                        <span className="text-xs text-slate-400 font-medium">
                          {formatChatTime(chat.activityTime > 0 ? chat.activityTime : chat.updatedAt)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between overflow-hidden">
                      <p className="text-xs text-slate-400 truncate font-normal max-w-[80%]">
                        {chat.lastMessage ? chat.lastMessage.content : 'No hay mensajes'}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                         <div 
                           className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${chat.aiDisabled ? 'bg-slate-300' : 'bg-primary'}`}
                           title={chat.aiDisabled ? 'IA Desactivada' : 'IA Activa'}
                         ></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {chatSessions.length > visibleChatsCount && (
              <div 
                className="py-4 text-center cursor-pointer text-xs font-semibold text-primary hover:bg-slate-50 transition-colors border-b border-slate-100/60 flex items-center justify-center gap-2"
                onClick={() => setVisibleChatsCount(prev => prev + 50)}
              >
                <span className="material-symbols-outlined text-[16px]">expand_more</span>
                Cargar más chats ({chatSessions.length - visibleChatsCount} ocultos)
              </div>
            )}
            </>
          ) : (
            <div className="p-12 text-center flex flex-col items-center gap-3 opacity-30">
               <span className="material-symbols-outlined text-5xl">chat_bubble_outline</span>
               <p className="text-xs font-medium text-slate-500">Sin conversaciones</p>
            </div>
          )}
        </div>
      </section>

      <section className={`flex-grow flex flex-col relative overflow-hidden bg-[#f7f4f0] ${selectedChat && !showContactInfo ? 'flex' : 'hidden md:flex'}`}>
        {activeChatData ? (
          <>
            <header className="h-14 flex items-center justify-between px-5 bg-white border-b border-outline-variant z-10">
              <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors px-2 py-1 rounded-lg"
                onClick={() => setShowContactInfo(!showContactInfo)}
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); onSelectChat(null); }}
                  className="md:hidden w-8 h-8 flex items-center justify-center text-slate-500 rounded-lg hover:bg-slate-100"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-semibold shadow-sm">
                  {activeChatData.customerName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-on-surface text-sm leading-tight">{activeChatData.customerName}</h3>
                  <p className="text-xs text-on-surface-variant font-normal leading-none">Desconectado</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                
                <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
                  <span className={`text-xs font-medium ${activeChatData.aiDisabled ? 'text-slate-400' : 'text-primary'}`}>
                    IA {activeChatData.aiDisabled ? 'Desactivada' : 'Activa'}
                  </span>
                  <button 
                    onClick={() => onToggleAI(selectedChat, !activeChatData.aiDisabled)}
                    className={`w-10 h-5 rounded-full relative transition-all duration-300 shadow-inner ${activeChatData.aiDisabled ? 'bg-slate-200' : 'bg-primary'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ${activeChatData.aiDisabled ? 'left-0.5' : 'left-[1.4rem]'}`}></div>
                  </button>
                </div>
              </div>
            </header>

            <div ref={scrollContainerRef} className="flex-grow overflow-y-auto flex flex-col relative group whatsapp-pattern custom-scrollbar">
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
                        <span className="bg-white/80 backdrop-blur text-slate-500 text-xs font-medium px-4 py-1.5 rounded-lg shadow-sm border border-slate-200/60">
                          {dateString}
                        </span>
                      </div>
                    )}
                    <div className={`w-full flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`flex items-center gap-2 group max-w-[75%] md:max-w-[60%] relative ${msg.role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
                        <div className={`transition-all relative ${
                          msg.role === 'user' 
                            ? 'bg-white text-on-surface rounded-tr-xl rounded-bl-xl rounded-br-xl shadow-sm border border-slate-200/60' 
                            : 'bg-chat-bubble-outgoing text-on-surface rounded-tl-xl rounded-bl-xl rounded-br-xl shadow-sm'
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
                                    e.target.parentElement.innerHTML = '<div class="flex flex-col items-center justify-center py-6 px-4 text-slate-400"><span class="material-symbols-outlined text-2xl mb-1">image_not_supported</span><span class="text-xs font-medium">Imagen no disponible</span></div>';
                                  }
                                }}
                              />
                            </div>
                          )}
                          
                          {msg.fileUrl && (() => {
                            const isAudio = msg.fileUrl.endsWith('.ogg') || msg.fileUrl.endsWith('.opus') || msg.fileUrl.endsWith('.mp3') || msg.content?.includes('[AUDIO]') || msg.content?.includes('🎙️ (Audio)');
                            const isVideo = msg.fileUrl.endsWith('.mp4') || msg.content?.includes('[VIDEO]');
                            
                            if (isAudio) {
                              return (
                                <div className="mb-2 w-full max-w-[240px]">
                                   <audio controls className="w-full h-10" src={formatMediaUrl(msg.fileUrl)} />
                                </div>
                              );
                            }
                            
                            if (isVideo) {
                              return (
                                <div className="mb-2 w-full max-w-[240px]">
                                   <video controls className="w-full rounded-lg max-h-48" src={formatMediaUrl(msg.fileUrl)} />
                                </div>
                              );
                            }

                            return (
                                <div className="mb-2 w-full max-w-[240px]">
                                   <a href={formatMediaUrl(msg.fileUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-black/5 rounded-lg hover:bg-black/10 transition-colors text-sm font-medium text-slate-700">
                                     <span className="material-symbols-outlined text-indigo-500">description</span>
                                     <span className="truncate flex-1">Ver Archivo</span>
                                     <span className="material-symbols-outlined text-[16px] text-slate-400">download</span>
                                   </a>
                                </div>
                            );
                          })()}

                          <p className="text-[13px] leading-relaxed font-normal whitespace-pre-wrap">
                            {msg.content?.replace(/\[AUDIO\]:? ?/, '🎙️ ')}
                          </p>
                          
                          <div className="flex justify-end items-center gap-1 mt-1">
                            <span className="text-xs text-slate-400 font-normal">
                              {timeString}
                            </span>
                            {msg.role !== 'user' && (
                              <>
                                {msg.status === 'read' ? (
                                  <span className="material-symbols-outlined text-xs text-[#53bdeb] font-bold" title="Leído (Chulitos Azules)">done_all</span>
                                ) : msg.status === 'delivered' ? (
                                  <span className="material-symbols-outlined text-xs text-slate-400 font-medium" title="Entregado al teléfono">done_all</span>
                                ) : (
                                  <span className="material-symbols-outlined text-xs text-slate-400 font-medium" title="Enviado por WhatsApp">done</span>
                                )}
                              </>
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
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 flex items-center justify-center cursor-pointer flex-shrink-0"
                            title="Opciones"
                          >
                            <span className="material-symbols-outlined text-base">more_vert</span>
                          </button>

                          {activeMessageMenu && activeMessageMenu.index === idx && (
                            <div 
                              className={`absolute bg-white rounded-xl shadow-2xl border border-slate-200 py-1 z-50 min-w-[140px] ${msg.role === 'user' ? 'left-0 mt-1' : 'right-0 mt-1'}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  onDeleteMessage && onDeleteMessage(selectedChat, activeMessageMenu.messageId);
                                  setActiveMessageMenu(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-red-50 transition-colors text-xs font-medium text-red-500 flex items-center gap-2"
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

            <footer className="p-4 bg-white border-t border-outline-variant">
               {activeChatData.isBlocked ? (
                 <div className="flex items-center justify-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg border border-red-100 text-xs font-medium">
                   <span className="material-symbols-outlined text-sm">block</span>
                   Contacto bloqueado
                 </div>
               ) : (
                 <div className="flex flex-col gap-3">
                    {/* Vista previa de imagen seleccionada */}
                    {filePreview && (
                      <div className="relative self-start p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                        <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-slate-200 shadow-sm" />
                        <div className="flex flex-col justify-center">
                          <span className="text-xs font-medium text-slate-400 leading-none mb-1">Imagen lista para enviar</span>
                          <span className="text-xs font-medium text-slate-700 truncate max-w-[150px]">{selectedFile?.name}</span>
                        </div>
                        <button 
                          onClick={() => { setSelectedFile(null); setFilePreview(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                       <button className="text-slate-400 hover:text-slate-600 transition-colors">
                          <span className="material-symbols-outlined text-2xl">mood</span>
                       </button>
                       <button 
                         onClick={() => fileInputRef.current?.click()}
                         className={`text-slate-400 hover:text-slate-600 transition-colors ${filePreview ? 'text-primary' : ''}`}
                       >
                          <span className="material-symbols-outlined text-2xl">attach_file</span>
                       </button>
                       <input 
                         type="file" 
                         ref={fileInputRef} 
                         onChange={handleFileChange} 
                         accept="image/*" 
                         className="hidden" 
                       />
                       <div className="flex-grow flex items-center bg-white border border-slate-200 rounded-lg px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                         <input 
                           className="w-full bg-transparent border-none text-sm text-slate-700 focus:ring-0 focus:outline-none placeholder:text-slate-400" 
                           placeholder={filePreview ? "Añadir un comentario..." : "Escribe un mensaje..."} 
                           value={inputValue}
                           onChange={(e) => setInputValue(e.target.value)}
                           onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                         />
                       </div>
                       <button 
                         onClick={handleSend}
                         className="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary-hover active:scale-[0.98] transition-all shadow-sm"
                       >
                         <span className="material-symbols-outlined text-xl">send</span>
                       </button>
                    </div>
                 </div>
               )}
            </footer>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-12 relative overflow-hidden">
             <div className="whatsapp-pattern"></div>
             <div className="w-20 h-20 rounded-xl bg-slate-50 flex items-center justify-center mb-6 border border-slate-200 z-10">
                <span className="material-symbols-outlined text-4xl text-slate-300 font-thin">all_inbox</span>
             </div>
             <h3 className="text-lg font-semibold text-slate-300 z-10">Selecciona un chat para comenzar</h3>
          </div>
        )}
      </section>

      {/* Right Sidebar - Info and Actions */}
      {selectedChat && activeChatData && (
        <section className={`transition-all duration-300 ease-in-out border-l border-outline-variant bg-white flex flex-col relative overflow-hidden ${
          showContactInfo ? 'w-full md:w-80 flex-shrink-0 visible opacity-100' : 'w-0 invisible opacity-0 border-none'
        }`}>
          <div className="p-6 flex flex-col items-center text-center border-b border-slate-100 relative">
            <button 
              onClick={() => setShowContactInfo(false)}
              className="md:hidden absolute top-4 left-4 w-10 h-10 flex items-center justify-center text-slate-500 rounded-lg bg-slate-100 hover:bg-slate-200"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center text-primary text-2xl font-semibold mb-3">
               {activeChatData.customerName.charAt(0)}
            </div>
            <h2 className="font-semibold text-lg text-on-surface leading-tight">{activeChatData.customerName}</h2>
            <p className="text-xs font-medium text-on-surface-variant mt-1">{selectedChat.split('_')[0]}</p>
          </div>

          <div className="flex-grow overflow-y-auto p-5 space-y-6 custom-scrollbar">
            <div className="bg-white border border-slate-200/60 rounded-xl p-5 shadow-sm">
               <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-primary text-xl">local_shipping</span>
                  <h4 className="font-medium text-sm text-on-surface">Datos del Pedido</h4>
               </div>
               
               <div className="space-y-3">
                 <div className="flex flex-col text-xs">
                   <span className="text-on-surface-variant font-medium">🛒 Producto:</span>
                   <span className="text-slate-800 font-semibold">{activeChatData.pendingApprovalProducts || 'Aún no especificado'}</span>
                 </div>
                 <div className="flex flex-col text-xs">
                   <span className="text-on-surface-variant font-medium">👤 Nombre:</span>
                   <span className="text-slate-700">{activeChatData.orderName || activeChatData.customerName || 'No especificado'}</span>
                 </div>
                 <div className="flex flex-col text-xs">
                   <span className="text-on-surface-variant font-medium">📞 Teléfono:</span>
                   <span className="text-slate-700">{activeChatData.orderPhone || selectedChat.split('_')[0] || 'No especificado'}</span>
                 </div>
                 <div className="flex flex-col text-xs">
                   <span className="text-on-surface-variant font-medium">📍 Dirección:</span>
                   <span className="text-slate-700">{activeChatData.address || 'No especificada'}</span>
                 </div>
                 <div className="flex flex-col text-xs">
                   <span className="text-on-surface-variant font-medium">🏙️ Municipio / Depto:</span>
                   <span className="text-slate-700">{(activeChatData.city && activeChatData.province) ? `${activeChatData.city}, ${activeChatData.province}` : (activeChatData.city || activeChatData.province || 'No especificado')}</span>
                 </div>
                 
                 <div className="pt-3 mt-1 border-t border-slate-100 flex justify-between items-center text-xs">
                   <span className="text-on-surface-variant font-medium">Estado:</span>
                   <span className={`px-2 py-1 rounded-md font-semibold ${activeChatData.orderRegistered ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                     {activeChatData.orderRegistered ? '✅ Enviado a WhatsApp' : '⏳ Pendiente de envío'}
                   </span>
                 </div>
               </div>
            </div>

            {/* Multimedia Gallery */}
            <div className="pt-2">
              <h4 className="text-xs font-medium text-on-surface-variant mb-3 px-1 flex items-center justify-between">
                Archivos y Comprobantes
                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-xs">
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
                      className="aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer hover:scale-105 transition-transform"
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
                  <div className="col-span-3 py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs font-medium text-slate-300">Sin multimedia</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-slate-100">
            <button 
              onClick={() => onDeleteChat && onDeleteChat(selectedChat)}
              className="w-full flex items-center justify-center gap-2 py-3 text-red-500 hover:text-white hover:bg-red-500 rounded-lg border border-red-100 hover:border-red-500 transition-all font-medium text-xs shadow-sm active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
              Eliminar Chat
            </button>
            <button 
              onClick={() => onToggleBlock && onToggleBlock(selectedChat, !activeChatData.isBlocked)}
              className={`w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-lg border transition-all font-medium text-xs shadow-sm active:scale-[0.98] ${
                activeChatData.isBlocked
                  ? 'text-emerald-600 border-emerald-200 hover:text-white hover:bg-emerald-600 hover:border-emerald-600'
                  : 'text-orange-600 border-orange-200 hover:text-white hover:bg-orange-600 hover:border-orange-600'
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {activeChatData.isBlocked ? 'lock_open' : 'block'}
              </span>
              {activeChatData.isBlocked ? 'Desbloquear Persona' : 'Bloquear Persona'}
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
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white backdrop-blur transition-colors"
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

      {/* 6. Kanban Board Overlay */}
      {showKanban && (
        <KanbanBoard 
          chats={chats} 
          onUpdateTag={onUpdateTag} 
          onClose={() => setShowKanban(false)} 
          onSendTrackingManual={onSendTrackingManual}
          onOpenDropiModal={() => setShowDropiModal(true)}
          globalLine={globalLine}
        />
      )}

      {/* 7. Dropi Upload Modal */}
      {showDropiModal && (
        <DropiUploadModal 
          serverUrl={serverUrl}
          onClose={() => setShowDropiModal(false)}
          onConfirmResults={(results) => {
            if (onConfirmBulkTracking) {
              onConfirmBulkTracking(results);
            }
          }}
        />
      )}
    </div>
  );
};

export default Simulator;
