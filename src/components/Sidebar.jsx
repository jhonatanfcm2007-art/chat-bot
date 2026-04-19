import React from 'react';

const Sidebar = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: 'inventory', icon: 'inventory_2', label: 'Inventario' },

    { id: 'simulator', icon: 'chat', label: 'Simulador' },


    { id: 'analytics', icon: 'monitoring', label: 'Analítica' },
  ];

  return (
    <aside className="bg-panel-bg w-64 h-full flex flex-col py-8 z-40 hidden md:flex font-body text-sm relative shadow-2xl">
      <div className="px-8 mb-12 flex items-center gap-4 relative">
        <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 rotate-3 transition-transform duration-500">
          <span className="material-symbols-outlined text-white text-2xl">account_balance_wallet</span>
        </div>
        <div>
          <h2 className="text-xl font-black text-white leading-none tracking-tight font-headline">Admin Vault</h2>
          <p className="text-[10px] text-panel-on-bg/40 font-black uppercase tracking-[0.25em] mt-1.5">Streaming Ops</p>
        </div>
      </div>
      
      <nav className="flex-grow space-y-1.5 px-3 relative">
        {menuItems.map((item) => (
          <div 
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex items-center gap-3.5 px-5 py-3.5 rounded-xl transition-all duration-300 cursor-pointer group mb-1 ${
              activeTab === item.id 
                ? 'bg-primary text-white font-black shadow-xl shadow-primary/20 scale-105 z-10' 
                : 'text-panel-on-bg/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className={`material-symbols-outlined transition-all duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:translate-x-1'}`}>{item.icon}</span>
            <span className="tracking-wide">{item.label}</span>
          </div>
        ))}
      </nav>

      <div className="px-3 mt-auto space-y-1.5 relative pt-6 border-t border-white/5">
        <div className="flex items-center gap-3.5 text-panel-on-bg/40 px-5 py-3.5 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 cursor-pointer group">
          <span className="material-symbols-outlined group-hover:rotate-90 transition-transform duration-500">settings</span>
          <span className="font-bold tracking-tight">Ajustes</span>
        </div>
        <div className="flex items-center gap-3.5 text-panel-on-bg/40 px-5 py-3.5 hover:text-error hover:bg-error/10 rounded-xl transition-all duration-300 cursor-pointer group">
          <span className="material-symbols-outlined group-hover:scale-110 transition-transform duration-300">logout</span>
          <span className="font-bold tracking-tight">Cerrar Sesión</span>
        </div>
        <div className="flex items-center gap-3.5 text-panel-on-bg/30 px-5 py-3.5 hover:text-white transition-all duration-200 cursor-pointer group">
          <span className="material-symbols-outlined text-sm">support_agent</span>
          <span className="text-xs font-bold">Ayuda & Soporte</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
