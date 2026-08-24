import React from 'react';

const MobileNav = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: 'simulator', icon: 'chat' },
    { id: 'ai_assistant', icon: 'psychology' },
    { id: 'knowledge_base', icon: 'menu_book' },
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
