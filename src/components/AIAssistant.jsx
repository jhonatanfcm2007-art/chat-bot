import React, { useState, useEffect, useRef } from 'react';

const AIAssistant = ({ settings, socket, serverUrl, globalLine }) => {
  const [sections, setSections] = useState([]);
  const [messages, setMessages] = useState([]); 
  const [isSaved, setIsSaved] = useState(false);
  
  // Estados para modo de edición de prompt (Tarjetas vs Texto Plano)
  const [editMode, setEditMode] = useState('raw');
  const [rawPrompt, setRawPrompt] = useState('');
  
  // Estados para Audio e Imagen de Bienvenida
  const [welcomeAudioEnabled, setWelcomeAudioEnabled] = useState(false);
  const [welcomeAudioUrl, setWelcomeAudioUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [welcomeImageEnabled, setWelcomeImageEnabled] = useState(false);
  const [welcomeImageUrl, setWelcomeImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  const audioInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Parsear el prompt plano en secciones estructuradas
  useEffect(() => {
    if (globalLine === 'all') return;
    
    const lineSettings = settings && settings[globalLine] ? settings[globalLine] : {
      systemPrompt: settings?.["1"]?.systemPrompt || '',
      welcomeAudioEnabled: false,
      welcomeAudioUrl: '',
      welcomeImageEnabled: false,
      welcomeImageUrl: ''
    };
    
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
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-center h-full">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-200">
          <span className="material-symbols-outlined text-5xl text-indigo-400">robot_2</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">Selecciona una Línea</h2>
        <p className="text-slate-500 max-w-md text-lg">
          Por favor, selecciona una línea específica en la esquina superior derecha para configurar su Asistente IA de forma independiente.
        </p>
      </div>
    );
  }

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
        ...(settings && settings[globalLine] ? settings[globalLine] : { systemPrompt: settings?.["1"]?.systemPrompt || '' }),
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
        ...(settings && settings[globalLine] ? settings[globalLine] : { systemPrompt: settings?.["1"]?.systemPrompt || '' }),
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
          body: JSON.stringify({ filename: file.name, base64: base64Data })
        });

        if (response.ok) {
          const data = await response.json();
          setWelcomeAudioUrl(data.url);
          socket.emit('sync_settings', {
            line: globalLine,
            settings: {
              ...(settings && settings[globalLine] ? settings[globalLine] : { systemPrompt: settings?.["1"]?.systemPrompt || '' }),
              welcomeAudioEnabled,
              welcomeAudioUrl: data.url,
              welcomeImageEnabled,
              welcomeImageUrl
            }
          });
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
          body: JSON.stringify({ filename: file.name, base64: base64Data })
        });

        if (response.ok) {
          const data = await response.json();
          setWelcomeImageUrl(data.url);
          socket.emit('sync_settings', {
            line: globalLine,
            settings: {
              ...(settings && settings[globalLine] ? settings[globalLine] : { systemPrompt: settings?.["1"]?.systemPrompt || '' }),
              welcomeAudioEnabled,
              welcomeAudioUrl,
              welcomeImageEnabled,
              welcomeImageUrl: data.url
            }
          });
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
    <div className="flex flex-col w-full h-full bg-slate-50 relative">
      
      {/* Sticky Header with Save Button */}
      <div className="flex-none bg-white border-b border-slate-200 px-6 md:px-10 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-40 shadow-sm">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-500">smart_toy</span>
            Configuración de IA
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Personaliza el comportamiento del bot para la línea seleccionada.</p>
        </div>
        <button 
          onClick={handleSaveSettings}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-sm ${
            isSaved 
              ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20 hover:-translate-y-0.5'
          }`}
        >
          <span className="material-symbols-outlined text-lg">{isSaved ? 'task_alt' : 'save'}</span>
          {isSaved ? 'Guardado Exitosamente' : 'Guardar Cambios'}
        </button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
        <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
          
          {/* Card 1: Entrenar IA */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                  <span className="material-symbols-outlined text-indigo-500 text-2xl">psychology</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Instrucciones del Bot (Prompt)</h3>
                  <p className="text-sm text-slate-500">Define cómo debe hablar y comportarse la inteligencia artificial.</p>
                </div>
              </div>
              
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 w-full md:w-auto">
                <button 
                  onClick={() => setEditMode('raw')}
                  className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    editMode === 'raw' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5"><span className="material-symbols-outlined text-sm">edit_document</span> Texto Libre</span>
                </button>
                <button 
                  onClick={() => setEditMode('cards')}
                  className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    editMode === 'cards' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5"><span className="material-symbols-outlined text-sm">view_list</span> Por Secciones</span>
                </button>
              </div>
            </div>

            <div className="p-6 md:p-8">
              {editMode === 'raw' ? (
                <div className="relative">
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-700 font-mono leading-relaxed min-h-[400px] focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 outline-none custom-scrollbar transition-all resize-y"
                    value={rawPrompt}
                    onChange={(e) => setRawPrompt(e.target.value)}
                    placeholder="Escribe o pega aquí las instrucciones para tu bot..."
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <button 
                      onClick={addSection}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-bold border border-indigo-100"
                    >
                      <span className="material-symbols-outlined text-sm">add</span> Añadir Sección
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {sections.map((section, idx) => (
                      <div key={idx} className={`border rounded-xl transition-all duration-300 ${section.isOpen ? 'border-indigo-200 bg-indigo-50/10 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                        <div 
                           className="px-5 py-4 flex items-center justify-between cursor-pointer group"
                           onClick={() => toggleSection(idx)}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${section.isOpen ? 'rotate-180 text-indigo-500' : ''}`}>expand_more</span>
                            <input 
                              className="bg-transparent border-none p-0 focus:ring-0 font-bold text-slate-700 w-full flex-1 outline-none"
                              value={section.title}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => updateSection(idx, 'title', e.target.value)}
                              placeholder="Título de la sección..."
                            />
                          </div>
                          {sections.length > 1 && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeSection(idx); }}
                              className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors ml-2"
                              title="Eliminar sección"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          )}
                        </div>
                        
                        {section.isOpen && (
                          <div className="px-5 pb-5 pt-1">
                            <textarea 
                              className="w-full bg-white border border-slate-200 rounded-lg p-4 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 outline-none text-slate-600 leading-relaxed min-h-[120px] custom-scrollbar resize-y"
                              value={section.content}
                              onChange={(e) => updateSection(idx, 'content', e.target.value)}
                              placeholder="Contenido de esta sección..."
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Grid para Multimedia (Audio e Imagen) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Card 2: Audio de Bienvenida */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center border border-teal-100">
                    <span className="material-symbols-outlined text-teal-500">record_voice_over</span>
                  </div>
                  <h3 className="font-bold text-slate-800">Audio de Bienvenida</h3>
                </div>
                <button 
                  onClick={() => handleToggleWelcomeAudio(!welcomeAudioEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${welcomeAudioEnabled ? 'bg-teal-500' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${welcomeAudioEnabled ? 'translate-x-6' : 'translate-x-1'}`}/>
                </button>
              </div>

              <div className={`p-6 flex-1 flex flex-col gap-6 transition-all ${welcomeAudioEnabled ? 'opacity-100' : 'opacity-50 grayscale pointer-events-none'}`}>
                <p className="text-sm text-slate-500">Se enviará como nota de voz automáticamente a los clientes nuevos.</p>
                
                <div 
                  onClick={() => welcomeAudioEnabled && audioInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all ${
                    isUploading 
                      ? 'border-teal-300 bg-teal-50' 
                      : 'border-slate-200 hover:border-teal-400 hover:bg-teal-50/30 cursor-pointer'
                  }`}
                >
                  <input type="file" ref={audioInputRef} onChange={handleAudioUpload} accept="audio/*" className="hidden" />
                  
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-teal-600">Subiendo...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center gap-2">
                      <span className="material-symbols-outlined text-3xl text-slate-300">cloud_upload</span>
                      <span className="text-sm font-bold text-slate-600">Subir nuevo audio</span>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mt-auto">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Audio Actual</span>
                  {welcomeAudioUrl ? (
                    <audio 
                      src={welcomeAudioUrl.startsWith('http') ? welcomeAudioUrl : `${serverUrl}${welcomeAudioUrl}`} 
                      controls 
                      className="w-full h-10"
                    />
                  ) : (
                    <div className="text-center py-2 text-sm text-slate-400">Sin configurar</div>
                  )}
                </div>
              </div>
            </div>

            {/* Card 3: Imagen de Bienvenida */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center border border-pink-100">
                    <span className="material-symbols-outlined text-pink-500">image</span>
                  </div>
                  <h3 className="font-bold text-slate-800">Imagen de Producto</h3>
                </div>
                <button 
                  onClick={() => handleToggleWelcomeImage(!welcomeImageEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${welcomeImageEnabled ? 'bg-pink-500' : 'bg-slate-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${welcomeImageEnabled ? 'translate-x-6' : 'translate-x-1'}`}/>
                </button>
              </div>

              <div className={`p-6 flex-1 flex flex-col gap-6 transition-all ${welcomeImageEnabled ? 'opacity-100' : 'opacity-50 grayscale pointer-events-none'}`}>
                <p className="text-sm text-slate-500">Se enviará como foto promocional automáticamente a los clientes nuevos.</p>
                
                <div className="flex flex-col sm:flex-row gap-4 h-full">
                  <div 
                    onClick={() => welcomeImageEnabled && imageInputRef.current?.click()}
                    className={`flex-1 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all ${
                      isUploadingImage 
                        ? 'border-pink-300 bg-pink-50' 
                        : 'border-slate-200 hover:border-pink-400 hover:bg-pink-50/30 cursor-pointer'
                    }`}
                  >
                    <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    
                    {isUploadingImage ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
                        <span className="text-xs font-bold text-pink-600">Subiendo...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center gap-2">
                        <span className="material-symbols-outlined text-3xl text-slate-300">add_photo_alternate</span>
                        <span className="text-sm font-bold text-slate-600">Subir foto</span>
                      </div>
                    )}
                  </div>

                  <div className="sm:w-1/3 bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col items-center justify-center">
                    {welcomeImageUrl ? (
                      <img 
                        src={welcomeImageUrl.startsWith('http') ? welcomeImageUrl : `${serverUrl}${welcomeImageUrl}`} 
                        alt="Preview" 
                        className="w-full max-h-24 object-contain rounded-lg shadow-sm border border-slate-200"
                      />
                    ) : (
                      <div className="text-center text-sm text-slate-400">Sin foto</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
