import fs from 'fs';
let content = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

const handleFetchGuidesStr = `
  const handleFetchGuides = async () => {
    setIsFetchingGuides(true);
    try {
      // Usaremos un endpoint en nuestro backend para que 
      // invoque a playwright y actualice todos los chats
      const response = await fetch(\`\${serverUrl}/api/incidents/test-access\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        alert("Microservicio en línea: " + data.message);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      alert('Error de red al obtener guías.');
    }
    setIsFetchingGuides(false);
  };
`;

// wait, I need to call the playwright service properly.
// I will just add the handleFetchGuides to Simulator.jsx, and later we'll connect it to the real backend endpoint.
const realFetchGuides = `
  const handleFetchGuides = async () => {
    setIsFetchingGuides(true);
    try {
      const response = await fetch(\`\${serverUrl}/api/fetch-guides\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        alert("¡Guías actualizadas! Se emparejaron " + data.matchedCount + " pedidos.");
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      alert('Error de red al invocar /api/fetch-guides.');
    }
    setIsFetchingGuides(false);
  };
`;

if (!content.includes('handleFetchGuides =')) {
    content = content.replace(
        "const handleAudit =",
        realFetchGuides + "\n\n  const handleAudit ="
    );
}

const uiSection = `
                   <div className="flex flex-col text-xs pt-2 mt-1 border-t border-slate-100">
                     <span className="text-on-surface-variant font-medium">📦 Guía Dropi:</span>
                     <div className="flex justify-between items-center mt-1">
                       <span className="text-slate-800 font-semibold">{activeChatData.trackingGuide || 'Pendiente'}</span>
                       <button 
                         onClick={handleFetchGuides} 
                         disabled={isFetchingGuides}
                         className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md text-[10px] font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                       >
                         {isFetchingGuides ? 'BUSCANDO...' : 'RECOGER GUÍAS'}
                       </button>
                     </div>
                   </div>
`;

if (!content.includes('Guía Dropi:')) {
    content = content.replace(
        /                   <div className="pt-3 mt-1 border-t border-slate-100 flex justify-between items-center text-xs">/,
        uiSection + "\n                   <div className=\"pt-3 mt-1 border-t border-slate-100 flex justify-between items-center text-xs\">"
    );
}

fs.writeFileSync('src/components/Simulator.jsx', content);
