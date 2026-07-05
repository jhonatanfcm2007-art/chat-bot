import React, { useState } from 'react';

const TAB_TITLES = {
  simulator: 'Chats',
  campaigns: 'Campañas',
  ai_assistant: 'Asistente IA',
  analytics: 'Reportes',
  remarketing: 'Remarketing',
  knowledge_base: 'Conocimiento',
  inventory: 'Inventario',
};

const Header = ({ activeTab, onTabChange, notifications = [], onNotificationClick, onClearNotifications, globalLine, setGlobalLine }) => {
  const [lineDropdownOpen, setLineDropdownOpen] = useState(false);

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 h-14 flex items-center justify-between px-5 z-40 fixed top-0 left-0 right-0 md:left-16">

      {/* Left: Page title */}
      <div className="flex items-center gap-3">
        {/* Mobile logo */}
        <div className="md:hidden flex items-center gap-2 cursor-pointer" onClick={() => onTabChange('simulator')}>
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-xs">V</span>
          </div>
        </div>
        <h1 className="text-base font-semibold text-on-surface hidden md:block">
          {TAB_TITLES[activeTab] || 'Dashboard'}
        </h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button
          onClick={onNotificationClick}
          className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
            notifications.length > 0 ? 'text-primary bg-primary-light' : 'text-slate-400 hover:bg-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-xl">
            {notifications.length > 0 ? 'notifications_active' : 'notifications'}
          </span>
          {notifications.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full" />
          )}
        </button>

        {/* Line selector (mobile only — desktop uses sidebar) */}
        <div className="relative md:hidden">
          <button
            onClick={() => setLineDropdownOpen(!lineDropdownOpen)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">
              {globalLine === 'all' ? 'domain' : 'sim_card'}
            </span>
          </button>

          {lineDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setLineDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50 animate-fade-in">
                {[
                  { val: 'all', label: 'Todas las Líneas', icon: 'domain' },
                  { val: 1, label: 'Línea 1', icon: 'looks_one' },
                  { val: 2, label: 'Línea 2', icon: 'looks_two' },
                ].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => { setGlobalLine(opt.val); setLineDropdownOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium transition-colors ${
                      globalLine === opt.val ? 'text-primary bg-primary-light' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Desktop line label */}
        <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200 ml-1">
          <span className="text-xs font-medium text-slate-400">
            {globalLine === 'all' ? 'Todas las Líneas' : `Línea ${globalLine}`}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
