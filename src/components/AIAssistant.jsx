import React, { useState, useEffect, useRef } from 'react';

const AIAssistant = ({ settings, socket, serverUrl, globalLine }) => {
  const [sections, setSections] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  // Estados para modo de edición de prompt (Tarjetas vs Texto Plano)
  const [editMode, setEditMode] = useState('raw'); // Default a texto plano para poder pegar directo
  const [rawPrompt, setRawPrompt] = useState('');
  
  // Estados para Audio e Imagen de Bienvenida
  const [welcomeAudioEnabled, setWelcomeAudioEnabled] = useState(false);
  const [welcomeAudioUrl, setWelcomeAudioUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [welcomeImageEnabled, setWelcomeImageEnabled] = useState(false);
  const [welcomeImageUrl, setWelcomeImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  const chatEndRef = useRef(null);
  const audioInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Parsear el prompt plano en secciones estructuradas
  useEffect(() => {
    if (globalLine === 'all') return;
    
    const lineSettings = settings && settings[globalLine] ? settings[globalLine] : settings?.["1"];
    
    if (lineSettings?.systemPrompt) {
      const raw = lineSettings.systemPrompt;
      setRawPrompt(raw);
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
    
    // Cargar estados de audio e imagen de bienvenida
    if (lineSettings) {
      setWelcomeAudioEnabled(lineSettings.welcomeAudioEnabled || false);
      setWelcomeAudioUrl(lineSettings.welcomeAudioUrl || '');
      setWelcomeImageEnabled(lineSettings.welcomeImageEnabled || false);
      setWelcomeImageUrl(lineSettings.welcomeImageUrl || '');
    }
  }, [settings, globalLine]);

  if (globalLine === 'all') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-center">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-200">
          <span className="material-symbols-outlined text-4xl text-slate-400">smart_toy</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Selecciona una Línea</h2>
        <p className="text-slate-500 max-w-md">
          Por favor, selecciona una línea específica en la esquina superior derecha para configurar su Asistente IA de forma independiente.
        </p>
      </div>
    );
  }

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

  const handleSaveSettings = async () => {
    const fullPrompt = editMode === 'raw' 
      ? rawPrompt 
      : sections.map(s => `### ${s.title.toUpperCase()}:\n${s.content}`).join('\n\n');
      
    const payload = { 
      ...settings, 
      systemPrompt: fullPrompt,
      welcomeAudioEnabled,
      welcomeAudioUrl,
      welcomeImageEnabled,
      welcomeImageUrl
    };

    // 1. Enviar por Socket
    socket.emit('sync_settings', { line: globalLine, settings: payload });

    // 2. Enviar por HTTP POST para 100% de garantía de guardado en el servidor
    try {
      await fetch(`${serverUrl}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line: globalLine, settings: payload })
      });
    } catch(e) {
      console.error('HTTP Save error:', e);
    }

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleToggleWelcomeAudio = (val) => {
    setWelcomeAudioEnabled(val);
    socket.emit('sync_settings', {
      line: globalLine,
      settings: {
        ...(settings && settings[globalLine] ? settings[globalLine] : settings?.["1"]),
        welcomeAudioEnabled: val,
        welcomeAudioUrl,
        welcomeImageEnabled,
        welcomeImageUrl
      }
    });
  };

  const handleToggleWelcomeImage = (val) => {
    setWelcomeImageEnabled(val);
    socket.emit('sync_settings', {
      line: globalLine,
      settings: {
        ...(settings && settings[globalLine] ? settings[globalLine] : settings?.["1"]),
        welcomeAudioEnabled,
        welcomeAudioUrl,
        welcomeImageEnabled: val,
        welcomeImageUrl
      }
    });
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      alert('Por favor selecciona un archivo de audio válido (mp3, ogg, wav, m4a, etc.)');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const base64Data = event.target.result;
        
        const response = await fetch(`${serverUrl}/api/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            base64: base64Data
          })
        });

        if (response.ok) {
          const data = await response.json();
          setWelcomeAudioUrl(data.url);
          socket.emit('sync_settings', {
            line: globalLine,
            settings: {
              ...(settings && settings[globalLine] ? settings[globalLine] : settings?.["1"]),
              welcomeAudioEnabled,
              welcomeAudioUrl: data.url,
              welcomeImageEnabled,
              welcomeImageUrl
            }
          });
          alert('¡Audio de bienvenida subido con éxito!');
        } else {
          alert('Error al subir el archivo de audio.');
        }
      } catch (err) {
        console.error('Error uploading audio:', err);
        alert('Ocurrió un error al subir el audio.');
      } finally {
        setIsUploading(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida (png, jpg, jpeg, webp)');
      return;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const base64Data = event.target.result;
        
        const response = await fetch(`${serverUrl}/api/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            base64: base64Data
          })
        });

        if (response.ok) {
          const data = await response.json();
          setWelcomeImageUrl(data.url);
          socket.emit('sync_settings', {
            line: globalLine,
            settings: {
              ...(settings && settings[globalLine] ? settings[globalLine] : settings?.["1"]),
              welcomeAudioEnabled,
              welcomeAudioUrl,
              welcomeImageEnabled,
              welcomeImageUrl: data.url
            }
          });
          alert('¡Imagen de bienvenida subida con éxito!');
        } else {
          alert('Error al subir la imagen.');
        }
      } catch (err) {
        console.error('Error uploading image:', err);
        alert('Ocurrió un error al subir la imagen.');
      } finally {
        setIsUploadingImage(false);
      }
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="flex-grow flex justify-center p-6 md:p-10 bg-background overflow-y-auto custom-scrollbar relative">
      <div className="w-full max-w-4xl space-y-8 flex flex-col">
        
        {/* Card 1: Entrenar IA */}
        <div className="bg-white p-10 md:p-12 rounded-xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h3 className="font-semibold text-on-surface text-2xl tracking-tight uppercase">Entrenar IA</h3>
              <p className="text-xs text-slate-500 mt-1">Elige cómo deseas editar las instrucciones de tu asistente virtual.</p>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <button 
                onClick={() => setEditMode('raw')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  editMode === 'raw' ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📝 Texto Completo (Pegar Todo)
              </button>
              <button 
                onClick={() => setEditMode('cards')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  editMode === 'cards' ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🗂️ Modo Secciones
              </button>
            </div>
          </div>

          {editMode === 'raw' ? (
            <div className="mb-8">
              <label className="block text-xs font-bold text-slate-500  mb-2">
                Pega aquí tu System Prompt completo:
              </label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-6 text-xs text-slate-800 font-mono leading-relaxed min-h-[400px] focus:ring-2 focus:ring-primary focus:outline-none custom-scrollbar shadow-inner"
                value={rawPrompt}
                onChange={(e) => setRawPrompt(e.target.value)}
                placeholder="Pega aquí todo tu prompt de ventas..."
              />
            </div>
          ) : (
            <>
              <div className="flex justify-end mb-4">
                <button 
                  onClick={addSection}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-primary border border-slate-200 rounded-xl hover:bg-primary hover:text-white transition-all text-xs font-semibold "
                >
                  <span className="material-symbols-outlined text-sm">add_circle</span>
                  Añadir punto
                </button>
              </div>
              
              <div className="space-y-4 pr-2 mb-8 max-h-[500px] overflow-y-auto custom-scrollbar">
                {sections.map((section, idx) => (
                  <div key={idx} className={`border border-slate-100 rounded-xl transition-all ${section.isOpen ? 'bg-slate-50/30' : 'bg-transparent'}`}>
                    <div 
                       className="px-6 py-4 flex items-center justify-between cursor-pointer group"
                       onClick={() => toggleSection(idx)}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`material-symbols-outlined text-sm transition-transform ${section.isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                        <input 
                          className="bg-transparent border-none p-0 focus:ring-0 font-semibold text-xs  text-on-surface cursor-text w-full max-w-[200px]"
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
            </>
          )}

          <button 
            onClick={handleSaveSettings}
            className={`w-full py-5 rounded-xl font-semibold tracking-[0.4em] uppercase text-xs transition-all duration-500 flex items-center justify-center gap-4 flex-shrink-0 ${
              isSaved 
                ? 'bg-tertiary text-white shadow-sm shadow-tertiary/20' 
                : 'bg-primary text-on-primary hover:shadow-2xl hover:shadow-primary/30 active:scale-[0.98]'
            }`}
          >
            <span className="material-symbols-outlined font-semibold text-2xl">{isSaved ? 'verified' : 'save_as'}</span>
            {isSaved ? 'Instrucciones Guardadas con Éxito' : 'Cargar Instrucciones al Bot'}
          </button>
        </div>

        {/* Card 2: Audio de Bienvenida */}
        <div className="bg-white p-10 md:p-12 rounded-xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
          
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-semibold text-on-surface text-2xl tracking-tight uppercase">Mensaje de Bienvenida (Audio)</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xl">
                Envía automáticamente un mensaje de voz a todos los clientes nuevos que entren a través de tu publicidad (solo cuando escriban por primera vez).
              </p>
            </div>
            
            {/* Toggle Switch */}
            <button 
              onClick={() => handleToggleWelcomeAudio(!welcomeAudioEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                welcomeAudioEnabled ? 'bg-primary' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  welcomeAudioEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="space-y-6 bg-slate-50/50 p-6 rounded-xl border border-slate-100">
            <div className="flex flex-col md:flex-row items-center gap-6">
              
              {/* Drop area/Button */}
              <div 
                onClick={() => audioInputRef.current?.click()}
                className={`w-full md:w-1/2 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                  isUploading 
                    ? 'border-primary bg-primary/5 cursor-wait' 
                    : 'border-slate-300 hover:border-primary hover:bg-slate-50'
                }`}
              >
                <input 
                  type="file" 
                  ref={audioInputRef} 
                  onChange={handleAudioUpload} 
                  accept="audio/*" 
                  className="hidden" 
                />
                
                {isUploading ? (
                  <>
                    <svg className="animate-spin h-8 w-8 text-primary mb-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-xs font-bold text-slate-600">Subiendo audio...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">mic</span>
                    <span className="text-xs font-bold text-slate-600 text-center">Haz clic para subir tu audio de bienvenida</span>
                    <span className="text-xs text-slate-400 mt-1">Formatos admitidos: .ogg, .mp3, .wav, .m4a</span>
                  </>
                )}
              </div>

              {/* Status & Player */}
              <div className="w-full md:w-1/2 flex flex-col justify-center">
                <span className="text-xs font-semibold  text-slate-400">Audio Activo</span>
                
                {welcomeAudioUrl ? (
                  <div className="mt-2 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-primary font-bold bg-primary/10 px-3 py-2 rounded-xl border border-primary/20 w-fit">
                      <span className="material-symbols-outlined text-sm">audiotrack</span>
                      <span>Audio Cargado Correctamente</span>
                    </div>
                    
                    {/* Audio Player */}
                    <audio 
                      src={welcomeAudioUrl.startsWith('http') ? welcomeAudioUrl : `${serverUrl}${welcomeAudioUrl}`} 
                      controls 
                      className="w-full h-10 mt-1 border border-slate-200 rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-slate-400 italic">
                    No hay ningún archivo de audio cargado todavía. Sube un archivo para comenzar.
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Card 3: Imagen de Bienvenida */}
        <div className="bg-white p-10 md:p-12 rounded-xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
          
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-semibold text-on-surface text-2xl tracking-tight uppercase">Mensaje de Bienvenida (Imagen de Producto Original)</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xl">
                Envía automáticamente la foto de tu producto Shilajit original a todos los clientes nuevos que escriban por primera vez.
              </p>
            </div>
            
            {/* Toggle Switch */}
            <button 
              onClick={() => handleToggleWelcomeImage(!welcomeImageEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                welcomeImageEnabled ? 'bg-primary' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  welcomeImageEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="space-y-6 bg-slate-50/50 p-6 rounded-xl border border-slate-100">
            <div className="flex flex-col md:flex-row items-center gap-6">
              
              {/* Drop area/Button */}
              <div 
                onClick={() => imageInputRef.current?.click()}
                className={`w-full md:w-1/2 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                  isUploadingImage 
                    ? 'border-primary bg-primary/5 cursor-wait' 
                    : 'border-slate-300 hover:border-primary hover:bg-slate-50'
                }`}
              >
                <input 
                  type="file" 
                  ref={imageInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                
                {isUploadingImage ? (
                  <>
                    <svg className="animate-spin h-8 w-8 text-primary mb-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-xs font-bold text-slate-600">Subiendo imagen...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">image</span>
                    <span className="text-xs font-bold text-slate-600 text-center">Haz clic para subir tu foto de producto original</span>
                    <span className="text-xs text-slate-400 mt-1">Formatos admitidos: .png, .jpg, .jpeg, .webp</span>
                  </>
                )}
              </div>

              {/* Status & Preview */}
              <div className="w-full md:w-1/2 flex flex-col justify-center">
                <span className="text-xs font-semibold  text-slate-400">Imagen Activa</span>
                
                {welcomeImageUrl ? (
                  <div className="mt-2 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-primary font-bold bg-primary/10 px-3 py-2 rounded-xl border border-primary/20 w-fit">
                      <span className="material-symbols-outlined text-sm">photo_library</span>
                      <span>Imagen Cargada Correctamente</span>
                    </div>
                    
                    {/* Image Preview */}
                    <img 
                      src={welcomeImageUrl.startsWith('http') ? welcomeImageUrl : `${serverUrl}${welcomeImageUrl}`} 
                      alt="Bienvenida Original" 
                      className="w-32 h-32 object-cover border border-slate-200 rounded-xl shadow-sm"
                    />
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-slate-400 italic">
                    No hay ninguna imagen cargada todavía. Sube una foto de tu producto original para comenzar.
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AIAssistant;
