import React, { useState, useEffect } from 'react';

const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Detectar si es iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    // Detectar si ya está instalado (standalone)
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
      const hasSeenPrompt = localStorage.getItem('ios-install-prompt-seen');
      if (!hasSeenPrompt) {
        setShowPrompt(true);
      }
    }
  }, []);

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-6 bg-black/20 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-primary rounded-3xl shadow-xl shadow-primary/30 flex items-center justify-center rotate-3">
             <img src="/app_icon.png" alt="App Icon" className="w-full h-full rounded-3xl object-cover" />
          </div>
        </div>
        
        <h2 className="text-2xl font-black text-on-surface text-center mb-2 tracking-tight">Instalar en tu iPhone</h2>
        <p className="text-on-surface-variant text-center text-sm mb-8 leading-relaxed px-4">
          Para usar la app en pantalla completa y acceder rápido, añádela a tu inicio.
        </p>

        <div className="space-y-4 bg-secondary-bg/50 p-6 rounded-3xl border border-outline-variant">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-on-surface-variant text-lg">share</span>
            </div>
            <p className="text-xs font-bold text-on-surface">1. Pulsa el botón 'Compartir' en Safari</p>
          </div>
          <div className="w-0.5 h-4 bg-outline-variant ml-4"></div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-on-surface-variant text-lg">add_box</span>
            </div>
            <p className="text-xs font-bold text-on-surface">2. Selecciona 'Añadir a pantalla de inicio'</p>
          </div>
        </div>

        <button 
          onClick={() => {
            setShowPrompt(false);
            localStorage.setItem('ios-install-prompt-seen', 'true');
          }}
          className="w-full mt-8 bg-on-surface text-white font-black py-4 rounded-2xl hover:bg-on-surface/90 transition-all active:scale-[0.98]"
        >
          ¡ENTENDIDO!
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
