import React, { useState, useEffect } from 'react';

const Header = ({ notifications = [], onNotificationClick, onClearNotifications }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen(prev => !prev);
  };


  return (
    <header className="bg-white flex justify-between items-center w-full px-4 md:px-8 h-20 z-50 fixed top-0 font-headline tracking-tight border-b border-outline-variant">
      <div className="flex items-center gap-8">
        <span className="text-xl font-bold tracking-wider text-primary hidden md:block">Admin Vault</span>

        <div className="hidden md:flex items-center bg-secondary-bg px-4 py-2 rounded-lg gap-3">
          <span className="material-symbols-outlined text-on-surface-variant">search</span>
          <input 
            className="bg-transparent border-none focus:ring-0 text-sm text-on-surface w-64 px-0" 
            placeholder="Buscar cuentas..." 
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-6 relative">
        <button 
          onClick={toggleDropdown}
          className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
            notifications.length > 0 ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'bg-secondary-bg text-on-surface-variant hover:text-primary hover:scale-105'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {notifications.length > 0 ? 'notifications_active' : 'notifications'}
          </span>
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              {notifications.length}
            </span>
          )}
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute top-14 right-16 w-80 bg-white rounded-3xl shadow-2xl border border-outline-variant overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="px-5 py-4 border-b border-outline-variant flex justify-between items-center bg-secondary-bg">
              <h4 className="font-black text-on-surface tracking-tight">Centro de Notificaciones</h4>
              {notifications.length > 0 && (
                <button onClick={onClearNotifications} className="text-[10px] uppercase tracking-widest font-bold text-tertiary hover:text-error transition-colors">
                  Limpiar Todas
                </button>
              )}
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-on-surface-variant opacity-60">
                  <span className="material-symbols-outlined text-4xl mb-2">notifications_paused</span>
                  <p className="text-sm font-medium">No tienes alertas pendientes</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      onClick={() => {
                        onNotificationClick(notif);
                        setIsDropdownOpen(false);
                      }}
                      className="p-4 border-b border-outline-variant hover:bg-primary/5 cursor-pointer transition-colors flex gap-4 items-start last:border-b-0"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                        notif.type === 'human' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'
                      }`}>
                        <span className="material-symbols-outlined text-xl">{notif.icon}</span>
                      </div>
                      <div>
                        <h5 className="font-bold text-sm text-on-surface">{notif.title}</h5>
                        <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2 leading-relaxed font-medium">{notif.body}</p>
                        <span className="text-[9px] font-bold text-tertiary uppercase tracking-widest mt-2 block opacity-70">
                          {notif.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <button className="w-10 h-10 rounded-full flex items-center justify-center bg-secondary-bg text-on-surface-variant hover:text-primary transition-colors shadow-sm">
           <span className="material-symbols-outlined text-[20px]">help_center</span>
        </button>
        <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant">
          <img 
            alt="Administrator Avatar" 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkhfyqiMCHE-ifNl6WZsm5jJnBL4Y5b4gl2TozJW9AvAlOgRI4i9Mz60k2CmNlk3KrV2dYSREFgAmzSa3rGnQQV2dHSV6s3nTMw0U-oXRTXLcLtkOfLYzsDNgdCjixFrSrKRESvX9yKwINhNhJHv9qtK1071_A8rLZARSCdw-AT7jsspLio3yFsPBycn6nZgRNjq0fAyeWjYfXu68I-k5e0xNwQr-BKUaVNA9L56kVPQ_VuktY5rvxmVd0ooc4LnDNDzA7XKrxwutp"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
