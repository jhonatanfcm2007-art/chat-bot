const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

// 1. Add state variables
if (!code.includes('const [guideDrafts')) {
    code = code.replace(
        'const [isFetchingGuides, setIsFetchingGuides] = useState(false);',
        'const [isFetchingGuides, setIsFetchingGuides] = useState(false);\n  const [guideDrafts, setGuideDrafts] = useState({});\n  const [isSendingGuide, setIsSendingGuide] = useState(false);'
    );
}

// 2. Add Helper Functions
const helpers = `
  const generateGuideMessage = (customerName, order) => {
    let msg = '¡Hola ' + (customerName ? customerName.split(' ')[0] : 'estimado cliente') + '! 👋\\n\\n';
    const st = (order.status || '').toLowerCase();
    if (st.includes('creado') || st.includes('pendiente')) {
      msg += 'Tu pedido ha sido procesado exitosamente y pronto será despachado. 📦\\n\\n';
    } else {
      msg += 'Te confirmamos que tu pedido ya va en camino hacia tu dirección. 🚚💨\\n\\n';
    }
    msg += '🧾 *Orden:* ' + (order.soyDropOrder || 'Desconocido') + '\\n';
    msg += '🔢 *Guía:* ' + (order.guide || 'Desconocida') + '\\n';
    if (order.status) {
      msg += '📌 *Estado Actual:* ' + order.status + '\\n\\n';
    }
    msg += 'Te estaremos avisando cualquier novedad. ¡Gracias por tu compra! ✨';
    return msg;
  };

  const handleSendGuide = async (order) => {
    if (!selectedChat || !activeChatData) return;
    
    // Checks
    const st = (order.status || '').toLowerCase();
    if (st.includes('cancelado')) return alert('❌ El pedido está cancelado. No se puede enviar guía.');
    if (st.includes('entregado')) return alert('⚠️ El pedido ya figura como entregado.');
    
    const customerName = activeChatData.orderName || activeChatData.customerName || 'Cliente';
    const draftText = guideDrafts[order.guide] || generateGuideMessage(customerName, order);
    
    if (!window.confirm('¿Enviar la guía '+order.guide+' a ' + customerName + '?\\n\\nMensaje:\\n' + draftText)) return;

    setIsSendingGuide(true);
    try {
      const response = await fetch(\`\${BACKEND_URL}/api/send-guide-message\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: selectedChat, guide: order.guide, messageText: draftText })
      });
      const data = await response.json();
      if (data.success) {
         alert('✅ Guía enviada correctamente y registrada en el sistema.');
      } else {
         alert('❌ Error al enviar la guía: ' + data.error);
      }
    } catch (e) {
      alert('Error de red al invocar /api/send-guide-message');
    }
    setIsSendingGuide(false);
  };
`;

if (!code.includes('generateGuideMessage')) {
    code = code.replace(
        'const handleFetchGuides = async () => {',
        helpers + '\n\n  const handleFetchGuides = async () => {'
    );
}

// 3. UI Replacement
const targetText = 'Guía Dropi:';
const guiaIndex = code.indexOf(targetText);
if (guiaIndex !== -1) {
    const startIdx = code.lastIndexOf('<div', guiaIndex);
    const endText = '{/* Multimedia Gallery */}';
    const endIdx = code.indexOf(endText, guiaIndex);
    
    if (startIdx !== -1 && endIdx !== -1) {
        const newUI = `                   <div className="flex flex-col text-xs pt-3 mt-1 border-t border-slate-100">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-on-surface-variant font-medium">📦 Guías Dropi:</span>
                        <button 
                         onClick={handleFetchGuides} 
                         disabled={isFetchingGuides || isSendingGuide}
                         className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md text-[10px] font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                       >
                         {isFetchingGuides ? 'BUSCANDO...' : 'RECOGER GUÍA'}
                       </button>
                     </div>
                     
                     {(!activeChatData.orders || activeChatData.orders.length === 0) && (
                         <div className="text-slate-500 italic text-[11px] bg-slate-50 p-2 rounded">
                             {activeChatData.trackingGuide ? \`Guía antigua: \${activeChatData.trackingGuide} (Haz clic en Recoger Guía para actualizar)\` : 'No se han detectado guías. Haz clic en Recoger Guía para buscar.'}
                         </div>
                     )}

                     {activeChatData.orders && activeChatData.orders.map((order, idx) => {
                         const draftKey = order.guide;
                         const cName = activeChatData.orderName || activeChatData.customerName || '';
                         const currentDraft = guideDrafts[draftKey] !== undefined ? guideDrafts[draftKey] : generateGuideMessage(cName, order);
                         
                         let statusColor = 'bg-slate-100 text-slate-600';
                         let statusText = 'Pendiente de envío';
                         if (order.guideStatus === 'enviada') {
                             statusColor = 'bg-emerald-50 text-emerald-600 border border-emerald-200';
                             statusText = '✅ Guía enviada';
                         } else if (order.guideStatus === 'error') {
                             statusColor = 'bg-red-50 text-red-600 border border-red-200';
                             statusText = '❌ Error al enviar';
                         } else if (isSendingGuide) {
                             statusText = '⏳ Envío en proceso...';
                         }

                         return (
                             <div key={idx} className="mt-2 bg-white border border-slate-200 rounded-md p-2 shadow-sm">
                                 <div className="flex justify-between items-center mb-2 border-b border-slate-100 pb-1">
                                    <div>
                                        <span className="font-bold text-slate-800">{order.guide}</span>
                                        <span className="ml-2 text-[10px] text-slate-500">#{order.soyDropOrder || '?'}</span>
                                    </div>
                                    <span className={\`px-2 py-0.5 rounded text-[10px] font-semibold \${statusColor}\`}>
                                        {statusText}
                                    </span>
                                 </div>
                                 <textarea 
                                    className="w-full text-[11px] p-2 border border-slate-200 rounded bg-slate-50 text-slate-700 resize-y min-h-[80px] focus:outline-none focus:ring-1 focus:ring-indigo-300"
                                    value={currentDraft}
                                    onChange={(e) => setGuideDrafts({...guideDrafts, [draftKey]: e.target.value})}
                                 />
                                 <button 
                                    onClick={() => handleSendGuide(order)}
                                    disabled={isSendingGuide || order.guideStatus === 'enviada' || !order.guide || order.guide === 'No detectada'}
                                    className="mt-2 w-full flex items-center justify-center gap-1 bg-green-50 text-green-700 py-1.5 rounded-md font-semibold text-[11px] hover:bg-green-100 transition-colors disabled:opacity-50"
                                 >
                                    <span className="material-symbols-outlined text-[14px]">send</span>
                                    {order.guideStatus === 'enviada' ? 'Volver a Enviar Guía' : 'Enviar guía por WhatsApp'}
                                 </button>
                             </div>
                         );
                     })}
                   </div>
                 </div>
              </div>

              {/* Multimedia Gallery */}`;
        code = code.substring(0, startIdx) + newUI + code.substring(endIdx + 26);
        fs.writeFileSync('src/components/Simulator.jsx', code);
        console.log('UI updated successfully.');
    }
}
