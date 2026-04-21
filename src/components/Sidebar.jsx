import React from 'react';

const Sidebar = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: 'inventory', icon: 'inventory_2', label: 'Inventario' },
    { id: 'simulator', icon: 'chat', label: 'Chats' },
    { id: 'ai_assistant', icon: 'psychology', label: 'Asistente IA' },
    { id: 'analytics', icon: 'monitoring', label: 'Analítica' },
  ];

  return (
    <aside className="bg-surface/80 backdrop-blur-2xl w-64 h-full flex flex-col py-8 z-40 hidden md:flex font-body text-sm relative border-r border-slate-200">
      <div className="px-8 mb-12 flex items-center gap-4 relative">
        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/5 border border-primary/20">
          <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
        </div>
        <div>
          <h2 className="text-lg font-black text-on-surface leading-none tracking-tight font-headline uppercase">Vault <span className="text-primary">X</span></h2>
          <p className="text-[9px] text-on-surface-variant font-bold uppercase tracking-[0.2em] mt-1 opacity-60">Operations</p>
        </div>
      </div>
      
      <nav className="flex-grow space-y-1.5 px-3 relative">
        {menuItems.map((item) => (
          <div 
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex items-center gap-3.5 px-5 py-3 rounded-xl transition-all duration-500 cursor-pointer group mb-1 ${
              activeTab === item.id 
                ? 'bg-primary/10 text-primary border border-primary/10 shadow-sm' 
                : 'text-on-surface-variant hover:text-on-surface hover:bg-slate-100'
            }`}
          >
            <span className={`material-symbols-outlined text-[22px] transition-all duration-300 ${activeTab === item.id ? 'scale-105 icon-fill' : 'group-hover:translate-x-1'}`}>{item.icon}</span>
            <span className={`tracking-wide font-medium ${activeTab === item.id ? 'font-black' : ''}`}>{item.label}</span>
          </div>
        ))}
      </nav>

      <div className="px-4 mt-auto space-y-1 relative pt-6 border-t border-slate-200">
        <div className="flex items-center gap-3.5 text-on-surface-variant/60 px-4 py-3 hover:text-on-surface hover:bg-slate-100 rounded-xl transition-all duration-300 cursor-pointer group">
          <span className="material-symbols-outlined group-hover:rotate-45 transition-transform duration-500">settings</span>
          <span className="font-semibold tracking-tight">Ajustes</span>
        </div>
        <div className="flex items-center gap-3.5 text-on-surface-variant/60 px-4 py-3 hover:text-error hover:bg-error/5 rounded-xl transition-all duration-300 cursor-pointer group">
          <span className="material-symbols-outlined group-hover:scale-110 transition-transform duration-300">logout</span>
          <span className="font-semibold tracking-tight">Salir</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

