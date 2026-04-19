import React from 'react';

const MobileNav = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: 'inventory', icon: 'inventory_2', label: 'Inventario' },
    { id: 'simulator', icon: 'chat', label: 'Chats' },
    { id: 'analytics', icon: 'monitoring', label: 'Analítica' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-outline-variant px-6 py-3 flex justify-between items-center z-[100] pb-safe-area-inset-bottom">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id)}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${
            activeTab === item.id ? 'text-primary scale-110' : 'text-on-surface-variant/40'
          }`}
        >
          <span className={`material-symbols-outlined text-2xl ${activeTab === item.id ? 'fill-1' : ''}`} style={{ fontVariationSettings: activeTab === item.id ? "'FILL' 1" : "'FILL' 0" }}>
            {item.icon}
          </span>
          <span className="text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default MobileNav;
