import React, { useState, useEffect, useRef } from 'react';

const AIAssistant = ({ settings, socket }) => {
  const [sections, setSections] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  const chatEndRef = useRef(null);

  // Parsear el prompt plano en secciones estructuradas
  useEffect(() => {
    if (settings?.systemPrompt) {
      const raw = settings.systemPrompt;
      const lines = raw.split('\n');
      const parsedSections = [];
      let currentSection = { title: 'General', content: '', isOpen: true };

      lines.forEach(line => {
        if (line.startsWith('### ')) {
          if (currentSection.content.trim() || currentSection.title !== 'General') {
            parsedSections.push({ ...currentSection, content: currentSection.content.trim() });
          }
          currentSection = { title: line.replace('### ', '').replace(':', ''), content: '', isOpen: false };
        } else {
          currentSection.content += line + '\n';
        }
      });
      parsedSections.push({ ...currentSection, content: currentSection.content.trim() });
      setSections(parsedSections);
    }
  }, [settings]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const toggleSection = (idx) => {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, isOpen: !s.isOpen } : s));
  };

  const updateSection = (idx, field, value) => {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const addSection = () => {
    setSections(prev => [...prev, { title: 'Nueva Sección', content: '', isOpen: true }]);
  };

  const removeSection = (idx) => {
    setSections(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveSettings = () => {
    const fullPrompt = sections.map(s => `### ${s.title.toUpperCase()}:\n${s.content}`).join('\n\n');
    socket.emit('sync_settings', { ...settings, systemPrompt: fullPrompt });
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
      {/* Configuration Section (Prioritized) */}
      <div className="w-full md:w-2/3 flex flex-col h-full">
        <div className="bg-white p-10 md:p-12 rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col relative h-full overflow-hidden">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h3 className="font-black text-on-surface text-3xl tracking-tight uppercase">Protocol Editor</h3>
              <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1 opacity-50">Modular Instruction Set</p>
            </div>
            <button 
              onClick={addSection}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-primary border border-slate-200 rounded-xl hover:bg-primary hover:text-white transition-all text-[10px] font-black uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              Añadir punto
            </button>
          </div>
          
          <div className="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar mb-8">
            {sections.map((section, idx) => (
              <div key={idx} className={`border border-slate-100 rounded-2xl transition-all ${section.isOpen ? 'bg-slate-50/30' : 'bg-transparent'}`}>
                <div 
                  className="px-6 py-4 flex items-center justify-between cursor-pointer group"
                  onClick={() => toggleSection(idx)}
                >
                  <div className="flex items-center gap-4">
                    <span className={`material-symbols-outlined text-sm transition-transform ${section.isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                    <input 
                      className="bg-transparent border-none p-0 focus:ring-0 font-black text-xs uppercase tracking-widest text-on-surface cursor-text w-full max-w-[200px]"
                      value={section.title}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateSection(idx, 'title', e.target.value)}
                    />
                  </div>
                  {sections.length > 1 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeSection(idx); }}
                      className="opacity-0 group-hover:opacity-40 hover:!opacity-100 text-error transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  )}
                </div>
                
                {section.isOpen && (
                  <div className="px-14 pb-6 animate-in slide-in-from-top-2 duration-300">
                    <textarea 
                      className="w-full bg-transparent border-none p-0 text-xs focus:ring-0 resize-none text-on-surface-variant leading-relaxed min-h-[100px] custom-scrollbar outline-none font-sans"
                      value={section.content}
                      onChange={(e) => updateSection(idx, 'content', e.target.value)}
                      placeholder="Indica aquí los detalles de este punto clave..."
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <button 
            onClick={handleSaveSettings}
            className={`w-full py-5 rounded-2xl font-black tracking-[0.4em] uppercase text-xs transition-all duration-500 flex items-center justify-center gap-4 flex-shrink-0 ${
              isSaved 
                ? 'bg-tertiary text-white shadow-xl shadow-tertiary/20' 
                : 'bg-primary text-on-primary hover:shadow-2xl hover:shadow-primary/30 active:scale-[0.98]'
            }`}
          >
            <span className="material-symbols-outlined font-black text-2xl">{isSaved ? 'verified' : 'save_as'}</span>
            {isSaved ? 'Protocolos Guardados' : 'Cargar Instrucciones al Bot'}
          </button>
        </div>
      </div>

      {/* Testing Section (Narrower) */}
      <div className="w-full md:w-1/3 flex flex-col bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden h-full">
        <header className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-black text-on-surface text-sm tracking-tight uppercase">Sandbox</h3>
            <p className="text-[8px] text-tertiary font-black uppercase tracking-[0.3em] flex items-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 bg-tertiary rounded-full animate-pulse"></span>
              Live Test
            </p>
          </div>
          <button 
            onClick={() => setMessages([])} 
            className="w-10 h-10 flex items-center justify-center text-on-surface-variant/30 hover:text-error transition-all" 
            title="Purge Stream"
          >
             <span className="material-symbols-outlined text-xl">delete_sweep</span>
          </button>
        </header>

        <div className="flex-grow p-8 overflow-y-auto space-y-6 relative custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center opacity-20">
              <span className="material-symbols-outlined text-5xl font-thin text-on-surface-variant">terminal</span>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] max-w-[150px] text-on-surface-variant">Waiting for sequence</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[90%] px-5 py-4 rounded-[1.5rem] transition-all text-sm ${
                msg.role === 'user' 
                  ? 'bg-slate-100 text-on-surface rounded-br-none' 
                  : 'bg-primary text-on-primary rounded-bl-none'
              }`}>
                <p className="leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
              </div>
            </div>
          ))}

          {isTyping && (
             <div className="flex flex-col items-start animate-in fade-in duration-300">
               <div className="bg-slate-50 px-5 py-4 rounded-[1.5rem] rounded-bl-none flex items-center gap-2">
                 <span className="w-1 h-1 bg-primary/40 rounded-full animate-bounce"></span>
                 <span className="w-1 h-1 bg-primary/70 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                 <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
               </div>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <footer className="p-6 border-t border-slate-100">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input 
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Inject command..."
              className="flex-grow bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 text-xs font-medium focus:ring-2 focus:ring-primary/10 text-on-surface placeholder:text-on-surface-variant/30 outline-none transition-all"
            />
            <button 
              type="submit"
              disabled={isTyping || !inputValue.trim()}
              className="w-12 h-12 bg-primary text-on-primary rounded-xl flex items-center justify-center disabled:opacity-20 transition-all active:scale-90 flex-shrink-0"
            >
              <span className="material-symbols-outlined text-xl">send</span>
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
};

export default AIAssistant;
