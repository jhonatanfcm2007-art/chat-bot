const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

// 1. Add settings prop
if (!code.includes('settings = {}')) {
    code = code.replace('chats, selectedChat', 'settings = {}, chats, selectedChat');
}

// 2. Add API call for Auto-Sync
if (!code.includes('toggleAutoSync')) {
    const toggleFunc = `
  const toggleAutoSync = async () => {
    const newVal = !settings.autoSyncGuides;
    try {
      await fetch(serverUrl + '/api/settings/toggle-auto-guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoSyncGuides: newVal })
      });
      // The socket event 'initial_settings' will update it globally
    } catch(e) {}
  };
`;
    code = code.replace('const handleSendMessage = async () => {', toggleFunc + '\n  const handleSendMessage = async () => {');
}

// 3. Add UI Button
const aiToggleMatch = `              <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
                  <span className={\`text-xs font-medium \${activeChatData.aiDisabled ? 'text-slate-400' : 'text-primary'}\`}>
                    IA {activeChatData.aiDisabled ? 'Desactivada' : 'Activa'}
                  </span>
                  <button 
                    onClick={() => onToggleAI(selectedChat, !activeChatData.aiDisabled)}
                    className={\`w-10 h-5 rounded-full relative transition-all duration-300 shadow-inner \${activeChatData.aiDisabled ? 'bg-slate-200' : 'bg-primary'}\`}
                  >
                    <div className={\`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 \${activeChatData.aiDisabled ? 'left-0.5' : 'left-[1.4rem]'}\`}></div>
                  </button>
                </div>`;

if (code.includes(aiToggleMatch) && !code.includes('toggleAutoSync')) {
    const newUI = `
                <div className="flex items-center gap-3 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                  <span className={\`text-xs font-medium \${!settings.autoSyncGuides ? 'text-indigo-400' : 'text-indigo-700'}\`}>
                    Auto-Sync Dropi
                  </span>
                  <button 
                    onClick={toggleAutoSync}
                    className={\`w-10 h-5 rounded-full relative transition-all duration-300 shadow-inner \${!settings.autoSyncGuides ? 'bg-slate-300' : 'bg-indigo-600'}\`}
                  >
                    <div className={\`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 \${!settings.autoSyncGuides ? 'left-0.5' : 'left-[1.4rem]'}\`}></div>
                  </button>
                </div>
` + aiToggleMatch;
    code = code.replace(aiToggleMatch, newUI);
}

fs.writeFileSync('src/components/Simulator.jsx', code);
console.log('Injected Auto-Sync Toggle');
