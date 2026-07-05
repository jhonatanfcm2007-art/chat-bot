import React, { useState, useEffect } from 'react';

// Helper to convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const NotificationPrompt = ({ serverUrl }) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. Verificar soporte de Service Worker y Push
    const isSupported = ('serviceWorker' in navigator) && ('PushManager' in window);
    if (!isSupported) return;

    // 2. Si ya está concedido, no mostrar
    if (Notification.permission === 'granted') return;

    // 3. Si es iOS, solo permitir en Standalone (PWA instalada)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
      // En iOS no standalone, Safari no permite registrar Push, así que no mostramos el prompt todavía
      // (Se muestra el InstallPrompt en su lugar)
      return;
    }

    // 4. Verificar si el usuario ya lo rechazó en esta sesión
    const hasSeenPrompt = sessionStorage.getItem('push-prompt-dismissed');
    if (!hasSeenPrompt) {
      setShowPrompt(true);
    }
  }, []);

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    setError(null);

    try {
      // Solicitar permiso explícito al navegador
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permiso de notificaciones denegado.');
      }

      // Obtener el registro del Service Worker activo
      const registration = await navigator.serviceWorker.ready;

      // Obtener la llave pública VAPID del servidor
      const resKey = await fetch(`${serverUrl}/api/vapid-public-key`);
      if (!resKey.ok) throw new Error('Error al obtener la clave VAPID del servidor.');
      const { publicKey } = await resKey.json();

      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      // Suscribirse al Push Service del navegador
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      // Enviar la suscripción al backend para guardarla
      const resSub = await fetch(`${serverUrl}/api/push-subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      if (!resSub.ok) throw new Error('Error al registrar la suscripción en el servidor.');

      // Suscripción exitosa
      setShowPrompt(false);
      console.log('📡 [PUSH] Suscripción registrada con éxito en el navegador y el servidor.');
    } catch (err) {
      console.error('❌ [PUSH] Error suscribiendo a push:', err);
      setError(err.message || 'Error de activación.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('push-prompt-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[150] w-[calc(100%-2rem)] max-w-lg animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="glass-card p-4 md:p-5 flex flex-col md:flex-row items-center gap-4 border-l-4 border-l-primary shadow-2xl relative overflow-hidden bg-white/95 backdrop-blur-md">
        
        {/* Decoración premium de fondo */}
        <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none"></div>

        {/* Icono de campana */}
        <div className="flex-shrink-0 w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shadow-inner">
          <span className="material-symbols-outlined text-2xl icon-fill animate-pulse">notifications_active</span>
        </div>

        {/* Contenido */}
        <div className="flex-grow text-center md:text-left">
          <h3 className="text-sm font-bold text-slate-800">¿Recibir alertas flotantes?</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Recibe notificaciones al instante cuando tus clientes escriban al WhatsApp o Messenger, directo en tu pantalla.
          </p>
          {error && (
            <p className="text-xs text-red-500 mt-1 font-semibold">{error}</p>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-end flex-shrink-0 mt-2 md:mt-0">
          <button
            onClick={handleDismiss}
            disabled={isSubscribing}
            className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-50"
          >
            Ahora no
          </button>
          
          <button
            onClick={handleSubscribe}
            disabled={isSubscribing}
            className="bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-primary/95 transition-all shadow-md shadow-primary/10 active:scale-[0.98] flex items-center gap-2"
          >
            {isSubscribing ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Activando...
              </>
            ) : (
              'Activar'
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default NotificationPrompt;
