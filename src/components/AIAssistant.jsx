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
    setMessages(prev => [...prev, newMsg]);
    setInputValue('');
    setIsTyping(true);

    socket.emit('test_ai', newMsg.content, (reply) => {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'bot', content: reply }]);
    });
  };

  return (
    <div className="flex-grow flex flex-col md:flex-row p-4 md:p-8 bg-background gap-8 overflow-y-auto">
      {/* Configuration Section */}
      <div className="w-full md:w-1/2 flex flex-col gap-6">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-on-surface tracking-tight">Entrenamiento IA</h1>
          <p className="text-on-surface-variant text-[11px] md:text-sm mt-1 uppercase font-bold tracking-widest opacity-60">Instrucciones y comportamiento</p>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-outline-variant shadow-sm flex-grow flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-on-surface text-lg">System Prompt</h3>
            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">psychology</span>
            </div>
          </div>
          <p className="text-xs md:text-sm text-on-surface-variant mb-6 leading-relaxed font-medium">
            Define la personalidad de la IA y cómo reaccionar. <strong>Importante:</strong> La IA inyectará el contenido del inventario automáticamente. Si quieres que derive a un humano, mantén la instrucción de usar la palabra clave secreta.
          </p>
          
          <textarea 
            className="flex-grow w-full bg-secondary-bg border-none rounded-[1.5rem] p-6 text-sm md:text-base focus:ring-2 focus:ring-primary/20 resize-none text-on-surface mb-6 min-h-[300px] leading-relaxed shadow-inner"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Escribe las instrucciones aquí..."
          />

          <button 
            onClick={handleSaveSettings}
            className={`w-full py-4 rounded-2xl font-black tracking-widest uppercase text-[11px] transition-all duration-300 flex items-center justify-center gap-2 ${
              isSaved ? 'bg-tertiary text-white shadow-lg shadow-tertiary/30 scale-[1.02]' : 'bg-primary text-white shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98]'
            }`}
          >
            <span className="material-symbols-outlined font-black">{isSaved ? 'check_circle' : 'save'}</span>
            {isSaved ? '¡Instrucciones Guardadas!' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* Testing Section */}
      <div className="w-full md:w-1/2 flex flex-col bg-white rounded-[2.5rem] border border-outline-variant shadow-sm overflow-hidden h-[600px] md:h-auto">
        <header className="px-6 py-5 border-b border-outline-variant flex justify-between items-center bg-secondary-bg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-on-surface flex items-center justify-center text-white shadow-lg">
              <span className="material-symbols-outlined">smart_toy</span>
            </div>
            <div>
              <h3 className="font-black text-on-surface tracking-tight">Chat Sandbox</h3>
              <p className="text-[10px] text-tertiary font-black uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-tertiary rounded-full animate-pulse"></span>
                Entorno Seguro
              </p>
            </div>
          </div>
          <button onClick={() => setMessages([])} className="text-on-surface-variant hover:text-error transition-colors p-2" title="Limpiar Chat">
             <span className="material-symbols-outlined">delete_sweep</span>
          </button>
        </header>

        <div className="flex-grow p-6 overflow-y-auto space-y-6 bg-[#f8fbff] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-20 scrollbar-hide">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-40 text-center">
              <span className="material-symbols-outlined text-6xl mb-4 font-thin">forum</span>
              <p className="text-sm font-medium max-w-[200px]">Escribe un mensaje para probar cómo responde la IA.</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] px-5 py-4 rounded-3xl shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-on-surface text-white shadow-xl shadow-on-surface/10 rounded-br-none' 
                  : 'bg-white text-on-surface border border-outline-variant rounded-bl-none'
              }`}>
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
              </div>
            </div>
          ))}

          {isTyping && (
             <div className="flex flex-col items-start">
               <div className="bg-white px-5 py-4 rounded-3xl rounded-bl-none border border-outline-variant shadow-sm flex items-center gap-1.5">
                 <span className="w-1.5 h-1.5 bg-on-surface/40 rounded-full animate-bounce"></span>
                 <span className="w-1.5 h-1.5 bg-on-surface/60 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                 <span className="w-1.5 h-1.5 bg-on-surface rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
               </div>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <footer className="p-4 bg-white border-t border-outline-variant">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input 
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Prueba interactuar aquí..."
              className="flex-grow bg-secondary-bg border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-primary/20"
            />
            <button 
              type="submit"
              disabled={isTyping || !inputValue.trim()}
              className="w-14 h-14 bg-on-surface text-white rounded-2xl flex items-center justify-center disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-on-surface/20 flex-shrink-0"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
};

export default AIAssistant;
