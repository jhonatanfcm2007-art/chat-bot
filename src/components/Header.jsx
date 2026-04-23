import React, { useState, useEffect } from 'react';

const Header = ({ notifications = [], onNotificationClick, onClearNotifications }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen(prev => !prev);
  };


  return (
    <header className="bg-surface/80 backdrop-blur-xl flex justify-between items-center w-full px-4 md:px-8 h-20 z-50 fixed top-0 font-headline tracking-tight border-b border-white/5">
      <div className="flex items-center gap-8">
        <span className="text-xl font-black tracking-widest text-primary hidden md:block uppercase">Admin <span className="text-on-surface">Vault</span></span>

        <div className="hidden md:flex items-center bg-white/5 border border-white/5 px-5 py-2.5 rounded-2xl gap-3 group focus-within:border-primary/30 transition-all">
          <span className="material-symbols-outlined text-on-surface-variant group-focus-within:text-primary transition-colors text-xl">search</span>
          <input 
            className="bg-transparent border-none focus:ring-0 text-sm text-on-surface w-64 px-0 placeholder:text-on-surface-variant/40" 
            placeholder="Search credentials, customers..." 
            type="text"
          />
        </div>
      </div>

      <div className="flex items-center gap-6 relative">
        <button 
          onClick={toggleDropdown}
          className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
            notifications.length > 0 
            ? 'bg-primary/20 text-primary border-primary/20 hover:bg-primary/30' 
            : 'bg-white/5 text-on-surface-variant border-white/5 hover:text-primary hover:border-primary/20 shadow-sm'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">
            {notifications.length > 0 ? 'notifications_active' : 'notifications'}
          </span>
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white text-[10px] font-black rounded-lg flex items-center justify-center shadow-lg animate-bounce">
              {notifications.length}
            </span>
          )}
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute top-14 right-0 w-80 bg-surface/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/5 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h4 className="font-black text-on-surface tracking-tight text-sm uppercase">Alert Center</h4>
              {notifications.length > 0 && (
                <button onClick={onClearNotifications} className="text-[10px] uppercase tracking-widest font-black text-primary hover:text-error transition-colors">
                  Clear
                </button>
              )}
            </div>
            
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-10 text-center text-on-surface-variant opacity-40">
                  <span className="material-symbols-outlined text-4xl mb-3">notifications_none</span>
                  <p className="text-xs font-bold tracking-wide">Nothing to report</p>
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
                      className="p-4 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors flex gap-4 items-start last:border-b-0"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                        notif.type === 'human' ? 'bg-error/10 text-error border border-error/20' : 'bg-primary/10 text-primary border border-primary/20'
                      }`}>
                        <span className="material-symbols-outlined text-xl">{notif.icon}</span>
                      </div>
                      <div className="flex-grow">
                        <h5 className="font-bold text-[13px] text-on-surface leading-tight">{notif.title}</h5>
                        <p className="text-[11px] text-on-surface-variant mt-1 line-clamp-2 leading-relaxed font-medium">{notif.body}</p>
                        <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest mt-2 block">
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
        <button className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 text-on-surface-variant border border-white/5 hover:text-primary hover:border-primary/20 transition-all">
           <span className="material-symbols-outlined text-[20px]">help_outline</span>
        </button>
        <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 p-0.5 bg-white/5 shadow-sm">
          <img 
            alt="Administrator Avatar" 
            className="w-full h-full object-cover rounded-lg" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkhfyqiMCHE-ifNl6WZsm5jJnBL4Y5b4gl2TozJW9AvAlOgRI4i9Mz60k2CmNlk3KrV2dYSREFgAmzSa3rGnQQV2dHSV6s3nTMw0U-oXRTXLcLtkOfLYzsDNgdCjixFrSrKRESvX9yKwINhNhJHv9qtK1071_A8rLZARSCdw-AT7jsspLio3yFsPBycn6nZgRNjq0fAyeWjYfXu68I-k5e0xNwQr-BKUaVNA9L56kVPQ_VuktY5rvxmVd0ooc4LnDNDzA7XKrxwutp"
          />
        </div>
      </div>

    </header>
  );
};

export default Header;
