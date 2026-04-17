import React, { useState, useEffect, useRef } from 'react';

const Simulator = ({ chats, selectedChat, onSelectChat, onSendMessage }) => {
  const [inputValue, setInputValue] = useState('');
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

  const activeChatData = selectedChat ? chats[selectedChat] : null;
  const chatSessions = Object.values(chats);

  return (
    <div className="flex flex-grow overflow-hidden">
      {/* Chat List Sidebar */}
      <section className="w-80 flex flex-col bg-panel-bg relative z-10">
        <div className="p-7 border-b border-white/5 flex items-center justify-between bg-white/5">
          <h3 className="font-headline font-black text-xl text-white tracking-tight">Chats</h3>
          <div className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center cursor-pointer hover:bg-primary transition-all">
            <span className="material-symbols-outlined text-xl">edit_square</span>
          </div>
        </div>
        <div className="p-5 border-b border-white/5 bg-white/5">
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm group-focus-within:text-primary transition-colors">search</span>
            <input 
              className="w-full bg-white/10 border border-white/5 rounded-xl py-2.5 pl-11 text-xs text-white placeholder:text-white/20 focus:ring-2 focus:ring-primary/40 focus:bg-white/15 transition-all outline-none" 
              placeholder="Buscar conversaciones..." 
              type="text"
            />
          </div>
        </div>
        <div className="flex-grow overflow-y-auto scrollbar-hide py-3 px-3">
          {chatSessions.length > 0 ? (
            chatSessions.map((chat) => (
              <div 
                key={chat.from}
                onClick={() => onSelectChat(chat.from)}
                className={`flex gap-4 px-4 py-4 rounded-xl cursor-pointer transition-all relative group mb-1 ${
                  selectedChat === chat.from ? 'bg-primary text-white shadow-2xl shadow-primary/30' : 'hover:bg-white/5 text-panel-on-bg/60'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all duration-500 ${
                    selectedChat === chat.from ? 'bg-white text-primary' : 'bg-white/10 text-white group-hover:bg-white/20'
                  }`}>
                    {chat.customerName.charAt(0)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-tertiary border-2 border-panel-bg rounded-lg"></div>
                </div>
                <div className="flex-grow overflow-hidden">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className={`font-bold truncate text-sm tracking-tight ${selectedChat === chat.from ? 'text-white' : 'text-white/90'}`}>
                      {chat.customerName}
                    </h4>
                    <span className={`text-[8px] font-black uppercase tracking-[0.1em] ${selectedChat === chat.from ? 'text-white/60' : 'text-white/20'}`}>2m</span>
                  </div>
                  <p className={`text-[11px] truncate font-medium ${selectedChat === chat.from ? 'text-white/80' : 'text-white/40'}`}>
                    {chat.messages[chat.messages.length - 1]?.content}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center flex flex-col items-center opacity-10">
               <span className="material-symbols-outlined text-5xl mb-4 text-white">inbox</span>
               <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white">Bandeja vacía</p>
            </div>
          )}
        </div>
      </section>

      {/* Main Chat Area */}
      <section className="flex-grow flex flex-col relative bg-background overflow-hidden">
        {activeChatData ? (
          <>
            <header className="h-20 flex items-center justify-between px-10 bg-white border-b border-outline-variant z-10 shadow-sm">
              <div className="flex items-center gap-5">
                <div className="relative group">
                  <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center font-black shadow-lg shadow-primary/20">
                    {activeChatData.customerName.charAt(0)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-tertiary border-2 border-white rounded-lg"></div>
                </div>
                <div>
                  <h3 className="font-black text-on-surface text-lg leading-none tracking-tight">{activeChatData.customerName}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="w-2 h-2 bg-tertiary rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    <p className="text-[10px] text-tertiary font-black uppercase tracking-widest">Bot Activo</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-xl border border-primary/10">
                   <span className="material-symbols-outlined text-primary text-sm">bolt</span>
                   <span className="text-[10px] font-black text-primary uppercase tracking-widest">Smart Reply</span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-all">more_horiz</span>
              </div>
            </header>

            <div className="flex-grow p-10 overflow-y-auto space-y-8 flex flex-col scrollbar-hide bg-[#f8fbff] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-20">
              <div className="flex justify-center mb-4">
                <span className="bg-white px-6 py-2 rounded-2xl text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] border border-outline-variant shadow-sm">Hoy</span>
              </div>

              {activeChatData.messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-start' : 'items-end'}`}>
                  <div className={`max-w-[70%] px-6 py-4 rounded-3xl shadow-sm transition-all duration-300 hover:shadow-md ${
                    msg.role === 'user' 
                      ? 'bg-white text-on-surface border border-outline-variant rounded-bl-none' 
                      : 'bg-primary text-white shadow-xl shadow-primary/10 rounded-br-none'
                  }`}>
                    <p className="text-[14px] leading-relaxed font-medium">{msg.content}</p>
                    <div className={`flex items-center gap-2 mt-3 ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <span className={`text-[8px] font-black uppercase tracking-[0.15em] ${msg.role === 'user' ? 'opacity-30' : 'opacity-60'}`}>
                        {msg.timestamp || msg.time}
                      </span>
                      {msg.role !== 'user' && (
                        <span className="material-symbols-outlined text-[12px] opacity-60" style={{fontVariationSettings: "'FILL' 1"}}>done_all</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <footer className="p-6 bg-white border-t border-outline-variant">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-4 bg-secondary-bg px-4 py-2 rounded-2xl border border-outline-variant"
              >
                <input 
                  className="flex-grow bg-transparent border-none focus:ring-0 text-sm text-on-surface" 
                  placeholder="Escribe un mensaje..." 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  type="text"
                />
                <button 
                  type="submit"
                  className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center cursor-pointer hover:shadow-lg hover:shadow-primary/30 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>send</span>
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-20 opacity-40">
            <span className="material-symbols-outlined text-8xl font-thin mb-4">forum</span>
            <h3 className="text-xl font-black text-on-surface">Selecciona un chat</h3>
            <p className="text-sm font-medium">Elige una conversación de la lista para empezar a chatear.</p>
          </div>
        )}

        {/* Floating Agent Status */}
        <div className="absolute top-20 right-6 flex flex-col gap-3">
          <div className="bg-white text-tertiary px-4 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-2 shadow-lg border border-outline-variant">
            <div className="w-2 h-2 bg-tertiary rounded-full animate-pulse"></div>
            AGENTE ACTIVO
          </div>
        </div>
      </section>
    </div>
  );
};

export default Simulator;
