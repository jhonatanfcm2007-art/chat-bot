import React, { useState } from 'react';

const Sidebar = ({ activeTab, onTabChange, globalLine, setGlobalLine }) => {
  const [expanded, setExpanded] = useState(false);
  const [lineMenuOpen, setLineMenuOpen] = useState(false);

  const navItems = [
    { id: 'simulator', icon: 'chat', label: 'Chats' },
    { id: 'analytics', icon: 'monitoring', label: 'Reportes' },
    { id: 'remarketing', icon: 'group', label: 'Remarketing' },
    { id: 'knowledge_base', icon: 'menu_book', label: 'Conocimiento' },
  ];

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => { setExpanded(false); setLineMenuOpen(false); }}
      className={`hidden md:flex flex-col bg-sidebar h-screen fixed left-0 top-0 z-[60]
        transition-all duration-200 ease-in-out
        ${expanded ? 'w-60' : 'w-16'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center h-14 px-4 border-b border-white/5 ${expanded ? 'gap-3' : 'justify-center'}`}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">V</span>
        </div>
        {expanded && (
          <span className="text-white font-semibold text-sm whitespace-nowrap animate-fade-in">
            Dropi Admin
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 flex flex-col gap-0.5 px-2 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex items-center rounded-lg h-10 transition-all duration-150 group
                ${expanded ? 'px-3 gap-3' : 'justify-center'}
                ${isActive
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }
              `}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
              )}

              <span className={`material-symbols-outlined text-xl flex-shrink-0 ${isActive ? 'icon-fill' : ''}`}>
                {item.icon}
              </span>

              {expanded && (
                <span className="text-sm font-medium whitespace-nowrap animate-fade-in">
                  {item.label}
                </span>
              )}

              {/* Tooltip when collapsed */}
              {!expanded && (
                <div className="sidebar-tooltip group-hover:opacity-100">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom: Line Selector */}
      <div className="border-t border-white/5 p-2">
        <div className="relative">
          <button
            onClick={() => setLineMenuOpen(!lineMenuOpen)}
            className={`w-full flex items-center rounded-lg h-10 transition-all duration-150
              ${expanded ? 'px-3 gap-3' : 'justify-center'}
              text-slate-400 hover:bg-white/5 hover:text-slate-200
            `}
          >
            <span className="material-symbols-outlined text-xl flex-shrink-0">
              {globalLine === 'all' ? 'domain' : 'sim_card'}
            </span>
            {expanded && (
              <span className="text-xs font-medium whitespace-nowrap animate-fade-in">
                {globalLine === 'all' ? 'Todas' : `Línea ${globalLine}`}
              </span>
            )}
          </button>

          {/* Line selector dropdown */}
          {lineMenuOpen && expanded && (
            <div className="absolute bottom-12 left-0 w-full bg-sidebar-hover rounded-lg border border-white/10 py-1 shadow-xl animate-fade-in">
              {[
                { val: 'all', label: 'Todas las Líneas', icon: 'domain' },
                { val: 1, label: 'Línea 1', icon: 'looks_one' },
                { val: 2, label: 'Línea 2', icon: 'looks_two' },
                { val: 3, label: 'Línea 3', icon: 'looks_3' },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => { setGlobalLine(opt.val); setLineMenuOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors
                    ${globalLine === opt.val ? 'text-primary bg-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}
                  `}
                >
                  <span className="material-symbols-outlined text-[16px]">{opt.icon}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
