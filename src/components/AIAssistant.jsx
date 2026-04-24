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
    <div className="flex-grow flex flex-col md:flex-row p-6 md:p-10 bg-background gap-8 overflow-y-auto custom-scrollbar relative">
      {/* Configuration Section */}
      <div className="w-full md:w-5/12 flex flex-col h-full">
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col relative h-full">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-black text-on-surface text-2xl tracking-tight uppercase">System Prompt</h3>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1 opacity-50">Behavioral Protocols</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center border border-primary/20">
              <span className="material-symbols-outlined text-2xl font-light">neurology</span>
            </div>
          </div>
          
          <textarea 
            className="flex-grow w-full bg-slate-50 border border-slate-100 rounded-[2rem] p-8 text-sm md:text-base focus:ring-2 focus:ring-primary/10 resize-none text-on-surface mb-8 leading-relaxed shadow-inner placeholder:text-on-surface-variant/30 custom-scrollbar outline-none focus:bg-white focus:border-primary/30 transition-all font-mono"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Define neural protocols here..."
          />

          <button 
            onClick={handleSaveSettings}
            className={`w-full py-5 rounded-[1.5rem] font-black tracking-[0.3em] uppercase text-[10px] transition-all duration-500 flex items-center justify-center gap-3 ${
              isSaved 
                ? 'bg-tertiary text-white shadow-xl shadow-tertiary/20' 
                : 'bg-primary text-on-primary hover:shadow-xl hover:shadow-primary/20 active:scale-[0.98]'
            }`}
          >
            <span className="material-symbols-outlined font-black text-xl">{isSaved ? 'verified' : 'save_as'}</span>
            {isSaved ? 'Protocols Secure' : 'Commit Changes'}
          </button>
        </div>
      </div>

      {/* Testing Section */}
      <div className="w-full md:w-7/12 flex flex-col bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden h-full">
        <header className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm">
              <span className="material-symbols-outlined text-2xl font-light">precision_manufacturing</span>
            </div>
            <div>
              <h3 className="font-black text-on-surface text-lg tracking-tight uppercase">Neural Sandbox</h3>
              <p className="text-[9px] text-tertiary font-black uppercase tracking-[0.4em] flex items-center gap-2 mt-2">
                <span className="w-2 h-2 bg-tertiary rounded-full animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.4)]"></span>
                Isolated Environment
              </p>
            </div>
          </div>
          <button 
            onClick={() => setMessages([])} 
            className="w-11 h-11 flex items-center justify-center text-on-surface-variant/40 hover:text-error hover:bg-error/5 rounded-2xl transition-all border border-slate-100" 
            title="Purge Stream"
          >
             <span className="material-symbols-outlined text-xl">delete_sweep</span>
          </button>
        </header>

        <div className="flex-grow p-10 overflow-y-auto space-y-8 relative custom-scrollbar">
          {/* Ambient Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center gap-6 text-center opacity-30">
              <span className="material-symbols-outlined text-7xl font-thin text-on-surface-variant">terminal</span>
              <p className="text-[10px] font-black uppercase tracking-[0.5em] max-w-[240px] text-on-surface-variant">Awaiting input sequence...</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] px-7 py-5 rounded-[1.8rem] transition-all ${
                msg.role === 'user' 
                  ? 'bg-slate-100 text-on-surface border border-slate-200 rounded-br-none' 
                  : 'bg-primary text-on-primary rounded-bl-none shadow-lg shadow-primary/10'
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

        <footer className="p-8 bg-slate-50 border-t border-slate-100">
          <form onSubmit={handleSendMessage} className="flex gap-4">
            <input 
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Inject test data..."
              className="flex-grow bg-white border border-slate-200 rounded-[1.5rem] px-8 py-5 text-sm font-medium focus:ring-2 focus:ring-primary/10 text-on-surface placeholder:text-on-surface-variant/30 outline-none focus:bg-white focus:border-primary/30 transition-all shadow-sm"
            />
            <button 
              type="submit"
              disabled={isTyping || !inputValue.trim()}
              className="w-16 h-16 bg-primary text-on-primary rounded-[1.5rem] flex items-center justify-center disabled:opacity-20 transition-all hover:scale-[1.05] active:scale-95 shadow-lg shadow-primary/20 flex-shrink-0"
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
