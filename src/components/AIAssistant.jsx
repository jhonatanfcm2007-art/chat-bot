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
    <div className="flex-grow flex justify-center p-6 md:p-10 bg-slate-50/50 overflow-y-auto custom-scrollbar relative">
      {/* Elementos decorativos de fondo (blur orbs) */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-400/20 rounded-full blur-[100px]"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-emerald-400/20 rounded-full blur-[100px]"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-pink-400/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-4xl space-y-8 flex flex-col relative z-10">
        
        {/* Card 1: Entrenar IA */}
        <div className="bg-white/80 backdrop-blur-2xl p-8 md:p-10 rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-500 flex flex-col relative overflow-hidden group">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 transform group-hover:scale-105 transition-transform duration-300">
                <span className="material-symbols-outlined text-white text-2xl">psychology</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-2xl tracking-tight">Entrenar IA</h3>
                <p className="text-sm text-slate-500 mt-0.5">Elige cómo deseas editar las instrucciones de tu asistente virtual.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50 backdrop-blur-md">
              <button 
                onClick={() => setEditMode('raw')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                  editMode === 'raw' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                📝 Texto Completo
              </button>
              <button 
                onClick={() => setEditMode('cards')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                  editMode === 'cards' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                🗂️ Modo Secciones
              </button>
            </div>
          </div>

          {editMode === 'raw' ? (
            <div className="mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-2xl pointer-events-none"></div>
                <textarea 
                  className="w-full bg-white/50 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 text-sm text-slate-700 font-mono leading-relaxed min-h-[400px] focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:outline-none custom-scrollbar shadow-inner transition-all"
                  value={rawPrompt}
                  onChange={(e) => setRawPrompt(e.target.value)}
                  placeholder="Pega aquí todo tu prompt de ventas..."
                />
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-end mb-4">
                <button 
                  onClick={addSection}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-600 hover:text-white transition-all text-xs font-bold shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">add_circle</span>
                  Añadir punto clave
                </button>
              </div>
              
              <div className="space-y-4 pr-2 mb-8 max-h-[500px] overflow-y-auto custom-scrollbar">
                {sections.map((section, idx) => (
                  <div key={idx} className={`border border-slate-200/60 rounded-2xl transition-all duration-300 overflow-hidden ${section.isOpen ? 'bg-white shadow-md' : 'bg-slate-50/50 hover:bg-white hover:shadow-sm'}`}>
                    <div 
                       className="px-6 py-4 flex items-center justify-between cursor-pointer group"
                       onClick={() => toggleSection(idx)}
                    >
                      <div className="flex items-center gap-4 w-full">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${section.isOpen ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                          <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${section.isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                        </div>
                        <input 
                          className="bg-transparent border-none p-0 focus:ring-0 font-bold text-sm text-slate-800 cursor-text w-full flex-1"
                          value={section.title}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateSection(idx, 'title', e.target.value)}
                          placeholder="Título de la sección..."
                        />
                      </div>
                      {sections.length > 1 && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeSection(idx); }}
                          className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-all ml-2"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      )}
                    </div>
                    
                    <div className={`transition-all duration-300 ease-in-out origin-top ${section.isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="px-6 pb-6 pt-2">
                        <textarea 
                          className="w-full bg-slate-50/50 border border-slate-100 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/30 resize-none text-slate-600 leading-relaxed min-h-[120px] custom-scrollbar outline-none font-sans"
                          value={section.content}
                          onChange={(e) => updateSection(idx, 'content', e.target.value)}
                          placeholder="Indica aquí los detalles de este punto clave..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <button 
            onClick={handleSaveSettings}
            className={`w-full py-4 rounded-2xl font-bold tracking-widest uppercase text-sm transition-all duration-500 flex items-center justify-center gap-3 relative overflow-hidden group ${
              isSaved 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5'
            }`}
          >
            {/* Efecto de brillo al pasar el mouse */}
            <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
            
            <span className="material-symbols-outlined font-bold text-xl relative z-10">{isSaved ? 'task_alt' : 'memory'}</span>
            <span className="relative z-10">{isSaved ? 'Instrucciones Actualizadas' : 'Actualizar Cerebro de IA'}</span>
          </button>
        </div>

        {/* Card 2: Audio de Bienvenida */}
        <div className="bg-white/80 backdrop-blur-2xl p-8 md:p-10 rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-500 flex flex-col relative overflow-hidden group">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 transform group-hover:scale-105 transition-transform duration-300">
                <span className="material-symbols-outlined text-white text-2xl">record_voice_over</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-2xl tracking-tight">Audio de Bienvenida</h3>
                <p className="text-sm text-slate-500 mt-0.5 max-w-lg">Envía automáticamente un mensaje de voz a todos los clientes nuevos que entren a través de tu publicidad.</p>
              </div>
            </div>
            
            <button 
              onClick={() => handleToggleWelcomeAudio(!welcomeAudioEnabled)}
              className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none shadow-inner ${
                welcomeAudioEnabled ? 'bg-emerald-500' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
                  welcomeAudioEnabled ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className={`transition-all duration-500 ${welcomeAudioEnabled ? 'opacity-100' : 'opacity-50 grayscale'}`}>
            <div className="flex flex-col md:flex-row gap-6">
              
              <div 
                onClick={() => welcomeAudioEnabled && audioInputRef.current?.click()}
                className={`w-full md:w-1/2 border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden ${
                  !welcomeAudioEnabled ? 'cursor-not-allowed border-slate-200 bg-slate-50/50' :
                  isUploading 
                    ? 'border-emerald-400 bg-emerald-50/50 cursor-wait' 
                    : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/30 cursor-pointer'
                }`}
              >
                <input 
                  type="file" 
                  ref={audioInputRef} 
                  onChange={handleAudioUpload} 
                  accept="audio/*" 
                  className="hidden" 
                  disabled={!welcomeAudioEnabled}
                />
                
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                    <span className="text-sm font-bold text-emerald-600">Subiendo a la nube...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors duration-300">
                      <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-emerald-500 transition-colors duration-300">cloud_upload</span>
                    </div>
                    <span className="text-sm font-bold text-slate-700">Haz clic para subir un audio nuevo</span>
                    <span className="text-xs text-slate-400 mt-2 font-medium">MP3, WAV, OGG, M4A</span>
                  </div>
                )}
              </div>

              <div className="w-full md:w-1/2 flex flex-col justify-center bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                <span className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-4">Audio Actual</span>
                
                {welcomeAudioUrl ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm text-emerald-600 font-bold bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-100">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm">check</span>
                      </div>
                      <span>Audio configurado y listo</span>
                    </div>
                    
                    <audio 
                      src={welcomeAudioUrl.startsWith('http') ? welcomeAudioUrl : `${serverUrl}${welcomeAudioUrl}`} 
                      controls 
                      className="w-full h-12 rounded-xl custom-audio-player"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-4">
                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">mic_off</span>
                    <p className="text-sm text-slate-400 font-medium">No hay audio configurado.</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Card 3: Imagen de Bienvenida */}
        <div className="bg-white/80 backdrop-blur-2xl p-8 md:p-10 rounded-3xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-500 flex flex-col relative overflow-hidden group">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/30 transform group-hover:scale-105 transition-transform duration-300">
                <span className="material-symbols-outlined text-white text-2xl">image</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-2xl tracking-tight">Imagen de Bienvenida</h3>
                <p className="text-sm text-slate-500 mt-0.5 max-w-lg">Envía automáticamente la foto de tu producto original a todos los clientes nuevos.</p>
              </div>
            </div>
            
            <button 
              onClick={() => handleToggleWelcomeImage(!welcomeImageEnabled)}
              className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none shadow-inner ${
                welcomeImageEnabled ? 'bg-pink-500' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
                  welcomeImageEnabled ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className={`transition-all duration-500 ${welcomeImageEnabled ? 'opacity-100' : 'opacity-50 grayscale'}`}>
            <div className="flex flex-col md:flex-row gap-6">
              
              <div 
                onClick={() => welcomeImageEnabled && imageInputRef.current?.click()}
                className={`w-full md:w-1/2 border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden ${
                  !welcomeImageEnabled ? 'cursor-not-allowed border-slate-200 bg-slate-50/50' :
                  isUploadingImage 
                    ? 'border-pink-400 bg-pink-50/50 cursor-wait' 
                    : 'border-slate-300 hover:border-pink-400 hover:bg-pink-50/30 cursor-pointer'
                }`}
              >
                <input 
                  type="file" 
                  ref={imageInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                  disabled={!welcomeImageEnabled}
                />
                
                {isUploadingImage ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin mb-4"></div>
                    <span className="text-sm font-bold text-pink-600">Procesando imagen...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-pink-100 transition-colors duration-300">
                      <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-pink-500 transition-colors duration-300">add_photo_alternate</span>
                    </div>
                    <span className="text-sm font-bold text-slate-700">Haz clic para subir una foto</span>
                    <span className="text-xs text-slate-400 mt-2 font-medium">PNG, JPG, JPEG, WEBP</span>
                  </div>
                )}
              </div>

              <div className="w-full md:w-1/2 flex flex-col justify-center bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                <span className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-4">Vista Previa</span>
                
                {welcomeImageUrl ? (
                  <div className="flex items-center gap-6">
                    <div className="relative group/img rounded-xl overflow-hidden shadow-md border border-slate-200 w-32 h-32 flex-shrink-0">
                      <img 
                        src={welcomeImageUrl.startsWith('http') ? welcomeImageUrl : `${serverUrl}${welcomeImageUrl}`} 
                        alt="Bienvenida Original" 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white">visibility</span>
                      </div>
                    </div>
                    <div className="flex flex-col justify-center">
                      <div className="flex items-center gap-2 text-sm text-pink-600 font-bold mb-1">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        <span>Imagen Lista</span>
                      </div>
                      <p className="text-xs text-slate-500">Se enviará esta imagen a tus clientes nuevos.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-4">
                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">hide_image</span>
                    <p className="text-sm text-slate-400 font-medium">No has subido ninguna foto.</p>
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
