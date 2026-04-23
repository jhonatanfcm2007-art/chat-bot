import React, { useState, useEffect, useRef } from 'react';

const AIAssistant = ({ settings, socket }) => {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (settings?.systemPrompt) {
      setPrompt(settings.systemPrompt);
    }
  }, [settings]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSaveSettings = () => {
    socket.emit('sync_settings', { ...settings, systemPrompt: prompt });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMsg = { role: 'user', content: inputValue };
    const currentHistory = [...messages];
    setMessages(prev => [...prev, newMsg]);
    setInputValue('');
    setIsTyping(true);

    socket.emit('test_ai', { content: newMsg.content, history: currentHistory }, (reply) => {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'bot', content: reply }]);
    });
  };

  return (
    <div className="flex-grow flex flex-col md:flex-row p-6 md:p-10 bg-background gap-10 overflow-y-auto custom-scrollbar relative">
      {/* Configuration Section */}
      <div className="w-full md:w-1/2 flex flex-col">
        <div className="bg-[#0b0e14]/60 backdrop-blur-3xl p-8 md:p-10 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col relative overflow-hidden group h-full">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors"></div>
          
          <div className="flex justify-between items-center mb-10 relative z-10">
            <h3 className="font-black text-on-surface text-xl tracking-tight uppercase">System Prompt</h3>
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center border border-primary/20 shadow-sm transition-transform group-hover:scale-110">
              <span className="material-symbols-outlined text-2xl font-light">neurology</span>
            </div>
          </div>
          
          <textarea 
            className="flex-grow w-full bg-[#020617]/80 border border-white/5 rounded-[2.5rem] p-8 text-sm md:text-base focus:ring-2 focus:ring-primary/20 resize-none text-white mb-8 leading-relaxed shadow-inner placeholder:text-white/10 custom-scrollbar outline-none focus:bg-[#020617] transition-all focus:border-primary/40 font-mono"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Define neural protocols here..."
          />

          <div className="relative z-10 pb-2">
            <button 
              onClick={handleSaveSettings}
              className={`w-full py-5 rounded-[1.8rem] font-black tracking-[0.3em] uppercase text-[10px] transition-all duration-700 flex items-center justify-center gap-3 ${
                isSaved 
                  ? 'bg-tertiary text-white shadow-[0_0_30px_rgba(45,212,191,0.3)] scale-[1.02]' 
                  : 'bg-primary text-on-primary shadow-2xl shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98]'
              }`}
            >
              <span className="material-symbols-outlined font-black text-xl">{isSaved ? 'verified' : 'bolt'}</span>
              {isSaved ? 'Protocols Secure' : 'Commit Logic'}
            </button>
          </div>
        </div>
      </div>

      {/* Testing Section */}
      <div className="w-full md:w-1/2 flex flex-col bg-[#0b0e14]/40 backdrop-blur-3xl rounded-[3.5rem] border border-white/5 shadow-2xl overflow-hidden h-full">
        <header className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-[#020617]/60">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary shadow-inner">
              <span className="material-symbols-outlined text-2xl font-light">precision_manufacturing</span>
            </div>
            <div>
              <h3 className="font-black text-on-surface text-lg tracking-tight uppercase">Neural Sandbox</h3>
              <p className="text-[9px] text-tertiary font-black uppercase tracking-[0.4em] flex items-center gap-2 mt-2">
                <span className="w-2 h-2 bg-tertiary rounded-full animate-pulse shadow-[0_0_10px_rgba(45,212,191,0.6)]"></span>
                Isolated Environment
              </p>
            </div>
          </div>
          <button 
            onClick={() => setMessages([])} 
            className="w-12 h-12 flex items-center justify-center text-white/20 hover:text-error hover:bg-error/10 rounded-2xl transition-all border border-white/5" 
            title="Purge Stream"
          >
             <span className="material-symbols-outlined text-xl">delete_sweep</span>
          </button>
        </header>

        <div className="flex-grow p-10 overflow-y-auto space-y-8 relative custom-scrollbar cube-pattern">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center gap-6 text-center opacity-10">
              <span className="material-symbols-outlined text-8xl font-thin text-white">terminal</span>
              <p className="text-[11px] font-black uppercase tracking-[0.5em] max-w-[240px] text-white">Awaiting input sequence...</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] px-7 py-5 rounded-[2rem] shadow-2xl transition-all ${
                msg.role === 'user' 
                  ? 'bg-chat-bubble-user text-white border border-white/10 rounded-br-none' 
                  : 'bg-gradient-to-br from-chat-bubble-agent-start to-chat-bubble-agent-end text-white rounded-bl-none shadow-[0_10px_30px_rgba(99,102,241,0.1)]'
              }`}>
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap font-medium tracking-wide">{msg.content}</p>
              </div>
            </div>
          ))}

          {isTyping && (
             <div className="flex flex-col items-start animate-in fade-in duration-300">
               <div className="glass px-7 py-5 rounded-[2rem] rounded-bl-none flex items-center gap-2.5">
                 <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></span>
                 <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                 <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
               </div>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <footer className="p-8 bg-[#020617]/80 border-t border-white/5 backdrop-blur-3xl">
          <form onSubmit={handleSendMessage} className="flex gap-4">
            <input 
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Inject test data..."
              className="flex-grow bg-white/5 border border-white/5 rounded-[1.8rem] px-8 py-5 text-sm font-medium focus:ring-1 focus:ring-primary/40 text-white placeholder:text-white/10 transition-all outline-none focus:bg-white/10"
            />
            <button 
              type="submit"
              disabled={isTyping || !inputValue.trim()}
              className="w-16 h-16 bg-primary text-on-primary rounded-[1.8rem] flex items-center justify-center disabled:opacity-20 transition-all hover:scale-[1.05] active:scale-95 shadow-xl shadow-primary/20 flex-shrink-0"
            >
              <span className="material-symbols-outlined text-2xl font-black">send</span>
            </button>
          </form>
        </footer>
      </div>
    </div>

  );
};

export default AIAssistant;
