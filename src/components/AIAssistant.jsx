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
    <div className="flex-grow flex flex-col md:flex-row p-6 md:p-10 bg-background gap-10 overflow-y-auto custom-scrollbar">
      {/* Configuration Section */}
      <div className="w-full md:w-1/2 flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight font-headline">AI Training</h1>
          <p className="text-on-surface-variant text-[11px] md:text-xs mt-2 uppercase font-black tracking-[0.3em] opacity-40">Intelligence & Logic Rules</p>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm flex-grow flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors"></div>
          
          <div className="flex justify-between items-center mb-8 relative z-10">
            <h3 className="font-black text-on-surface text-xl tracking-tight">System Prompt</h3>
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center border border-primary/20 shadow-sm">
              <span className="material-symbols-outlined text-2xl">neurology</span>
            </div>
          </div>
          
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8 relative z-10">
            <p className="text-xs md:text-[13px] text-on-surface-variant leading-relaxed font-medium opacity-80">
              Define the AI's core identity and response logic. <strong className="text-primary">Note:</strong> Stock data is injected automatically. Maintain the secret keyword rule for human escalation.
            </p>
          </div>
          
          <textarea 
            className="flex-grow w-full bg-slate-50 border border-slate-200 rounded-[2rem] p-8 text-sm md:text-base focus:ring-2 focus:ring-primary/10 resize-none text-on-surface mb-8 min-h-[350px] leading-relaxed shadow-inner placeholder:text-slate-300 custom-scrollbar outline-none focus:bg-white transition-all focus:border-primary/30"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Define neural protocols here..."
          />

          <button 
            onClick={handleSaveSettings}
            className={`w-full py-5 rounded-[1.5rem] font-black tracking-[0.2em] uppercase text-[10px] transition-all duration-500 flex items-center justify-center gap-3 relative z-10 ${
              isSaved 
                ? 'bg-tertiary text-white shadow-2xl shadow-tertiary/20 scale-[1.02]' 
                : 'bg-primary text-on-primary shadow-2xl shadow-primary/20 hover:scale-[1.01] active:scale-[0.98]'
            }`}
          >
            <span className="material-symbols-outlined font-black text-xl">{isSaved ? 'verified' : 'bolt'}</span>
            {isSaved ? 'Protocols Secure' : 'Commit Logic'}
          </button>
        </div>
      </div>

      {/* Testing Section */}
      <div className="w-full md:w-1/2 flex flex-col bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden h-[700px] md:h-auto">
        <header className="px-8 py-7 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 backdrop-blur-xl">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-2xl">precision_manufacturing</span>
            </div>
            <div>
              <h3 className="font-black text-on-surface text-lg tracking-tight">Neural Sandbox</h3>
              <p className="text-[9px] text-primary font-black uppercase tracking-[0.3em] flex items-center gap-2 mt-1.5">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(13,148,136,0.5)]"></span>
                Isolated Environment
              </p>
            </div>
          </div>
          <button 
            onClick={() => setMessages([])} 
            className="w-12 h-12 flex items-center justify-center text-on-surface-variant opacity-40 hover:text-error hover:opacity-100 hover:bg-error/5 rounded-2xl transition-all border border-slate-100" 
            title="Purge Stream"
          >
             <span className="material-symbols-outlined text-xl">delete_sweep</span>
          </button>
        </header>

        <div className="flex-grow p-8 overflow-y-auto space-y-8 bg-slate-50/30 relative custom-scrollbar">
          {/* Subtle Ambient Glow */}
          <div className="absolute inset-0 bg-primary/[0.01] pointer-events-none"></div>

          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center opacity-10">
              <span className="material-symbols-outlined text-7xl font-thin text-on-surface">terminal</span>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] max-w-[200px] text-on-surface">Awaiting input sequence...</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] px-6 py-4 rounded-[1.8rem] shadow-sm transition-all ${
                msg.role === 'user' 
                  ? 'bg-primary text-on-primary rounded-br-none shadow-primary/10' 
                  : 'bg-white text-on-surface border border-slate-100 rounded-bl-none'
              }`}>
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap font-medium tracking-wide">{msg.content}</p>
              </div>
            </div>
          ))}

          {isTyping && (
             <div className="flex flex-col items-start animate-in fade-in duration-300">
               <div className="bg-white px-6 py-4 rounded-[1.5rem] rounded-bl-none border border-slate-100 shadow-sm flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></span>
                 <span className="w-1.5 h-1.5 bg-primary/70 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                 <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
               </div>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <footer className="p-8 bg-white border-t border-slate-100 backdrop-blur-3xl">
          <form onSubmit={handleSendMessage} className="flex gap-4">
            <input 
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Test neural integrity..."
              className="flex-grow bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-5 text-sm font-medium focus:ring-2 focus:ring-primary/10 text-on-surface placeholder:text-slate-300 transition-all outline-none focus:bg-white"
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
