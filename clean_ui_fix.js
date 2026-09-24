import fs from 'fs';
let content = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

// 1. Add isFetchingGuides state
content = content.replace(
    "const [isFullscreenImage, setFullscreenImage] = useState(null);",
    "const [isFetchingGuides, setIsFetchingGuides] = useState(false);\n  const [isFullscreenImage, setFullscreenImage] = useState(null);"
);

// 2. Add handleFetchGuides function
const handleFetchGuidesStr = `
  const handleFetchGuides = async () => {
    if (!selectedChat) return alert("Selecciona un chat primero.");
    setIsFetchingGuides(true);
    try {
      const response = await fetch(\`\${serverUrl}/api/fetch-guides\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: selectedChat })
      });
      const data = await response.json();
      if (data.success) {
        alert("¡Guía obtenida y verificada!\\n\\nGuía: " + data.orderData.guide + "\\nTeléfono: " + data.orderData.phone + "\\nEstado: " + data.orderData.status);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      alert('Error de red al invocar /api/fetch-guides.');
    }
    setIsFetchingGuides(false);
  };

  const handleAudit =`;

content = content.replace("const handleAudit =", handleFetchGuidesStr);

// 3. Add UI before the Estado div
const targetEstadoDiv = `<div className="pt-3 mt-1 border-t border-slate-100 flex justify-between items-center text-xs">
                     <span className="text-on-surface-variant font-medium">Estado:</span>`;

const uiReplacement = `<div className="flex flex-col text-xs pt-2 mt-1 border-t border-slate-100">
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
                   
                   <div className="pt-3 mt-1 border-t border-slate-100 flex justify-between items-center text-xs">
                     <span className="text-on-surface-variant font-medium">Estado:</span>`;

content = content.replace(targetEstadoDiv, uiReplacement);

fs.writeFileSync('src/components/Simulator.jsx', content);
console.log("UI built cleanly!");
