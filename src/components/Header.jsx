import React, { useState } from 'react';

const Header = ({ activeTab, onTabChange, notifications = [], onNotificationClick, onClearNotifications }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const menuItems = [
    { id: 'simulator', icon: 'chat', label: 'Chats' },
    { id: 'campaigns', icon: 'campaign', label: 'Campañas' },
    { id: 'ai_assistant', icon: 'psychology', label: 'Asistente IA' },
    { id: 'analytics', icon: 'monitoring', label: 'Reportes' },
  ];

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 z-50 fixed top-0 w-full">
      {/* 1. Logo - Left */}
      <div className="flex items-center gap-2.5 cursor-pointer min-w-[200px]" onClick={() => onTabChange('simulator')}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden shadow-md shadow-primary/10 border border-primary/20 bg-white">
          <img src="/logo.png" alt="Vault X" className="w-7 h-7 object-contain" />
        </div>
        <span className="text-lg font-black tracking-tight text-slate-800">Vault <span className="text-primary">X</span></span>
      </div>

      {/* 2. Nav Menu - Centered */}
      <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === item.id 
                ? 'bg-primary text-white shadow-md shadow-primary/10' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <span className={`material-symbols-outlined text-xl ${activeTab === item.id ? 'icon-fill' : ''}`}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* 3. Actions - Right */}
      <div className="flex items-center gap-4 min-w-[200px] justify-end">


        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            notifications.length > 0 ? 'bg-primary/10 text-primary' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-xl">
            {notifications.length > 0 ? 'notifications_active' : 'notifications'}
          </span>
          {notifications.length > 0 && (
            <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
          )}
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1"></div>

        <div className="flex items-center gap-3 pl-1">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-800 leading-none">Admin User</p>
            <p className="text-[10px] text-slate-500 mt-1">Super Administrador</p>
          </div>
          <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 shadow-sm">
            <img 
              alt="Avatar" 
              className="w-full h-full object-cover" 
              src="https://ui-avatars.com/api/?name=Admin&background=004d4d&color=fff"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
