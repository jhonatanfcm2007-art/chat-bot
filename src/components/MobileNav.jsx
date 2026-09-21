import React from 'react';

const MobileNav = ({ activeTab, onTabChange, currentUser }) => {
  const menuItems = [
    { id: 'simulator', icon: 'chat' },
    { id: 'incidents', icon: 'local_shipping' },
    { id: 'knowledge_base', icon: 'menu_book' },
    ...(['admin', 'socio'].includes(currentUser?.role) ? [
      { id: 'ai_assistant', icon: 'psychology' }
    ] : []),
    ...(currentUser?.role === 'admin' ? [
      { id: 'users', icon: 'people' },
    ] : [])
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-around items-center z-[100]">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onTabChange(item.id)}
          className={`flex flex-col items-center justify-center w-12 h-10 rounded-lg transition-all duration-150 ${
            activeTab === item.id ? 'text-primary' : 'text-slate-400'
          }`}
        >
          <span className={`material-symbols-outlined text-[22px] ${activeTab === item.id ? 'icon-fill' : ''}`}>
            {item.icon}
          </span>
          {activeTab === item.id && (
            <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
          )}
        </button>
      ))}
    </nav>
  );
};

export default MobileNav;
