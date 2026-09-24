import fs from 'fs';
let content = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

const targetStr = '<span className="text-on-surface-variant font-medium">Estado:</span>';
const index = content.indexOf(targetStr);

if (index !== -1) {
    // Buscar el div padre que contiene esto
    const divStart = content.lastIndexOf('<div className="pt-3 mt-1 border-t border-slate-100 flex justify-between items-center text-xs">', index);
    
    if (divStart !== -1) {
        const uiSection = `
                   <div className="flex flex-col text-xs pt-2 mt-1 border-t border-slate-100">
                     <span className="text-on-surface-variant font-medium">📦 Guía Dropi:</span>
                     <div className="flex justify-between items-center mt-1">
                       <span className="text-slate-800 font-semibold">{activeChatData.orders && activeChatData.orders.length > 0 ? activeChatData.orders[activeChatData.orders.length - 1].guide : (activeChatData.trackingGuide || 'Pendiente')}</span>
                       <button 
                         onClick={handleFetchGuides} 
                         disabled={isFetchingGuides}
                         className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md text-[10px] font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                       >
                         {isFetchingGuides ? 'BUSCANDO...' : 'RECOGER GUÍA'}
                       </button>
                     </div>
                   </div>
                   
                   <div className="pt-3 mt-1 border-t border-slate-100 flex justify-between items-center text-xs">`;
        
        content = content.substring(0, divStart) + uiSection + content.substring(divStart + '<div className="pt-3 mt-1 border-t border-slate-100 flex justify-between items-center text-xs">'.length);
        fs.writeFileSync('src/components/Simulator.jsx', content);
        console.log("UI inserted via substring!");
    }
}
