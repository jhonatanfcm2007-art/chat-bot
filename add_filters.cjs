const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

// 1. Add states
const stateMatch = "const [filterTag, setFilterTag] = useState('all');";
if (code.includes(stateMatch) && !code.includes('filterGuide')) {
    code = code.replace(stateMatch, stateMatch + '\n  const [filterGuide, setFilterGuide] = useState(\'all\');\n  const [isGuideMenuOpen, setIsGuideMenuOpen] = useState(false);');
}

// 2. Add filter logic
const filterMatch = "if (filterOwner !== 'all') {";
if (code.includes(filterMatch) && !code.includes('if (filterGuide !== \'all\')')) {
    const newFilter = `
      if (filterGuide !== 'all') {
        if (!chat.orders || chat.orders.length === 0) return false;
        const hasMatch = chat.orders.some(o => o.guideStatus === filterGuide);
        if (!hasMatch) return false;
      }
      if (filterOwner !== 'all') {
`;
    code = code.replace(filterMatch, newFilter);
}

// 3. Add UI Button
const uiMatch = "{/* FILTER MENU */}";
if (code.includes(uiMatch) && !code.includes('setIsGuideMenuOpen')) {
    const newUI = `
                {/* GUIDE FILTER */}
                <div className="relative">
                  <button 
                    onClick={() => {
                      setIsGuideMenuOpen(!isGuideMenuOpen);
                      setIsFilterMenuOpen(false);
                      setIsProductMenuOpen(false);
                      setIsCountryMenuOpen(false);
                      setIsOwnerMenuOpen(false);
                    }}
                    className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors \${filterGuide !== 'all' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}\`}
                  >
                    <span className="material-symbols-outlined text-[16px] w-4 h-4">local_shipping</span>
                    <span className="hidden sm:inline">{filterGuide === 'all' ? 'Guías' : filterGuide === 'pendiente' ? 'Guía pendiente' : filterGuide === 'revisar' ? 'Revisar' : 'Guía enviada'}</span>
                    <span className="material-symbols-outlined text-[14px]">expand_more</span>
                  </button>

                  {isGuideMenuOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 z-[100] py-1 overflow-hidden">
                      {[
                        { id: 'all', label: 'Todas las Guías', icon: 'all_inclusive' },
                        { id: 'pendiente', label: 'Guía pendiente', icon: 'schedule' },
                        { id: 'revisar', label: 'Revisar', icon: 'rule' },
                        { id: 'enviada', label: 'Guía enviada', icon: 'check_circle' },
                        { id: 'error', label: 'Error de envío', icon: 'error' }
                      ].map((item) => (
                        <div 
                          key={item.id}
                          onClick={() => { setFilterGuide(item.id); setIsGuideMenuOpen(false); }}
                          className={\`px-4 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-3 \${filterGuide === item.id ? 'bg-indigo-50' : ''}\`}
                        >
                          <span className="material-symbols-outlined text-sm text-slate-400">{item.icon}</span>
                          <span className="text-xs font-medium text-slate-600">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* FILTER MENU */}
`;
    code = code.replace(uiMatch, newUI);
}

fs.writeFileSync('src/components/Simulator.jsx', code);
console.log('Injected filters');
