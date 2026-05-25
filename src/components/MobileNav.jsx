import React from 'react';

const MobileNav = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: 'inventory', icon: 'inventory_2', label: 'Inventario' },
    { id: 'simulator', icon: 'chat', label: 'Chats' },
    { id: 'campaigns', icon: 'campaign', label: 'Campañas' },
    { id: 'analytics', icon: 'monitoring', label: 'Analítica' },
    { id: 'ai_assistant', icon: 'psychology', label: 'IA' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-3xl border-t border-slate-200 px-6 py-3 flex justify-between items-center z-[100] pb-safe-area-inset-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id)}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${
            activeTab === item.id ? 'text-primary scale-105' : 'text-slate-400'
          }`}
        >
          <span className={`material-symbols-outlined text-[24px] ${activeTab === item.id ? 'icon-fill' : ''}`}>
            {item.icon}
          </span>
          <span className="text-[10px] font-bold">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default MobileNav;
