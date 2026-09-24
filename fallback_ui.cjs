const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

const replacement = `
                     {(!activeChatData.orders || activeChatData.orders.length === 0) && activeChatData.trackingGuide && (
                         <div className="mt-2 bg-white border border-slate-200 rounded-md p-2 shadow-sm">
                             <div className="text-slate-500 italic text-[11px] mb-2">Recuperando guía desde el registro anterior... (Haz clic en Recoger Guía para actualizar los datos reales)</div>
                             <div className="flex justify-between items-center mb-2 border-b border-slate-100 pb-1">
                                <span className="font-bold text-slate-800">{activeChatData.trackingGuide}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">Pendiente de envío</span>
                             </div>
                             <textarea 
                                className="w-full text-[11px] p-2 border border-slate-200 rounded bg-slate-50 text-slate-700 resize-y min-h-[80px] focus:outline-none focus:ring-1 focus:ring-indigo-300"
                                value={guideDrafts[activeChatData.trackingGuide] !== undefined ? guideDrafts[activeChatData.trackingGuide] : generateGuideMessage(activeChatData.orderName || activeChatData.customerName || '', { guide: activeChatData.trackingGuide, soyDropOrder: '?' })}
                                onChange={(e) => setGuideDrafts({...guideDrafts, [activeChatData.trackingGuide]: e.target.value})}
                             />
                             <button 
                                onClick={() => handleSendGuide({ guide: activeChatData.trackingGuide, soyDropOrder: '?', status: 'Desconocido' })}
                                disabled={isSendingGuide}
                                className="mt-2 w-full flex items-center justify-center gap-1 bg-green-50 text-green-700 py-1.5 rounded-md font-semibold text-[11px] hover:bg-green-100 transition-colors disabled:opacity-50"
                             >
                                <span className="material-symbols-outlined text-[14px]">send</span>
                                Enviar guía por WhatsApp
                             </button>
                         </div>
                     )}
                     
                     {(!activeChatData.orders || activeChatData.orders.length === 0) && !activeChatData.trackingGuide && (
                         <div className="text-slate-500 italic text-[11px] bg-slate-50 p-2 rounded">
                             No se han detectado guías. Haz clic en Recoger Guía para buscar.
                         </div>
                     )}
`;

const searchString = `{(!activeChatData.orders || activeChatData.orders.length === 0) && (
                         <div className="text-slate-500 italic text-[11px] bg-slate-50 p-2 rounded">
                             {activeChatData.trackingGuide ? \`Guía antigua: \${activeChatData.trackingGuide} (Haz clic en Recoger Guía para actualizar)\` : 'No se han detectado guías. Haz clic en Recoger Guía para buscar.'}
                         </div>
                     )}`;

code = code.replace(searchString, replacement);
fs.writeFileSync('src/components/Simulator.jsx', code);
