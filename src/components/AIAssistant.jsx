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
    <div className="flex-grow flex justify-center p-6 md:p-10 bg-background overflow-y-auto custom-scrollbar relative">
      <div className="w-full flex flex-col h-full">
        <div className="bg-white p-10 md:p-12 rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col relative h-full overflow-hidden">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h3 className="font-black text-on-surface text-3xl tracking-tight uppercase">Entrenar IA</h3>
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
    </div>
  );
};

export default AIAssistant;
