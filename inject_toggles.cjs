const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

const matchStr = '<div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">';
const idx = code.indexOf(matchStr);

if (idx !== -1 && !code.includes('Auto-Sync')) {
    const newUI = `
                    <div className="flex items-center gap-3 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                      <span className={\`text-xs font-medium \${!settings?.autoSyncGuides ? 'text-indigo-400' : 'text-indigo-700'}\`}>
                        Auto-Sync
                      </span>
                      <button 
                        onClick={toggleAutoSync}
                        className={\`w-10 h-5 rounded-full relative transition-all duration-300 shadow-inner \${!settings?.autoSyncGuides ? 'bg-slate-300' : 'bg-indigo-600'}\`}
                      >
                        <div className={\`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 \${!settings?.autoSyncGuides ? 'left-0.5' : 'left-[1.4rem]'}\`}></div>
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                      <span className={\`text-xs font-medium \${!settings?.autoSendGuides ? 'text-green-400' : 'text-green-700'}\`}>
                        Auto-Envío
                      </span>
                      <button 
                        onClick={toggleAutoSend}
                        className={\`w-10 h-5 rounded-full relative transition-all duration-300 shadow-inner \${!settings?.autoSendGuides ? 'bg-slate-300' : 'bg-green-600'}\`}
                      >
                        <div className={\`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 \${!settings?.autoSendGuides ? 'left-0.5' : 'left-[1.4rem]'}\`}></div>
                      </button>
                    </div>
                ` + matchStr;
    code = code.substring(0, idx) + newUI + code.substring(idx + matchStr.length);
}

fs.writeFileSync('src/components/Simulator.jsx', code);
console.log('Saved');
