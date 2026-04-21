import React from 'react';

const MobileNav = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: 'inventory', icon: 'inventory_2', label: 'Inventario' },
    { id: 'simulator', icon: 'chat', label: 'Chats' },
    { id: 'analytics', icon: 'monitoring', label: 'Analítica' },
    { id: 'ai_assistant', icon: 'psychology', label: 'IA' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-panel-bg/90 backdrop-blur-3xl border-t border-white/5 px-8 py-4 flex justify-between items-center z-[100] pb-safe-area-inset-bottom shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id)}
          className={`flex flex-col items-center gap-1.5 transition-all duration-500 relative ${
            activeTab === item.id ? 'text-primary scale-110' : 'text-white/20'
          }`}
        >
          {activeTab === item.id && (
            <div className="absolute -top-1 w-5 h-1 bg-primary rounded-full blur-[2px]"></div>
          )}
          <span className={`material-symbols-outlined text-[26px] ${activeTab === item.id ? 'fill-1' : ''}`} style={{ fontVariationSettings: activeTab === item.id ? "'FILL' 1" : "'FILL' 0" }}>
            {item.icon}
          </span>
          <span className="text-[9px] font-black uppercase tracking-[0.1em]">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default MobileNav;
