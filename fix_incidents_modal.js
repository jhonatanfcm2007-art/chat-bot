import fs from 'fs';
let content = fs.readFileSync('src/components/Incidents.jsx', 'utf8');

// 1. Add props to the function signature
content = content.replace(
    /function Incidents\(\{ BACKEND_URL, socket \}\) \{/,
    "function Incidents({ BACKEND_URL, socket, onSelectChat }) {"
);

// 2. Add state for selected incident
content = content.replace(
    /const \[isLoading, setIsLoading\] = useState\(true\);/,
    "const [isLoading, setIsLoading] = useState(true);\n    const [selectedIncident, setSelectedIncident] = useState(null);"
);

// 3. Update the button to set the selected incident
const btnTarget = `<button className="text-primary hover:text-primary-hover font-medium bg-primary/5 px-3 py-1.5 rounded-lg transition-colors">
                                                Ver Detalles
                                            </button>`;
const btnFix = `<button onClick={() => setSelectedIncident(inc)} className="text-primary hover:text-primary-hover font-medium bg-primary/5 px-3 py-1.5 rounded-lg transition-colors">
                                                Ver Detalles
                                            </button>`;
content = content.replace(btnTarget, btnFix);

// 4. Add the modal at the end of the return
const modalHtml = `
            {selectedIncident && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-semibold text-lg text-slate-800">Detalles de la Incidencia</h3>
                            <button onClick={() => setSelectedIncident(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Pedido y Guía</p>
                                        <p className="text-sm font-semibold text-slate-800">{selectedIncident.orderNumber} <span className="text-slate-400 font-normal ml-2">{selectedIncident.trackingNumber}</span></p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Cliente</p>
                                        <p className="text-sm font-medium text-slate-800">{selectedIncident.firstName} {selectedIncident.lastName}</p>
                                        <p className="text-sm text-slate-500">{selectedIncident.phone}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Destino</p>
                                        <p className="text-sm text-slate-700">{selectedIncident.country} - {selectedIncident.courier}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Estado Soy Drop</p>
                                        <p className="text-sm text-slate-700"><span className="font-medium text-slate-800">Envío:</span> {selectedIncident.shipmentStatus}</p>
                                        <p className="text-sm text-slate-700"><span className="font-medium text-slate-800">Incidencia:</span> {selectedIncident.incidentStatus}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Categoría</p>
                                        <p className="text-sm font-medium text-slate-800">{selectedIncident.category}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Motivo / Mensaje del Conductor</p>
                                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                                            <p className="text-sm text-amber-900 leading-relaxed">{selectedIncident.reason || 'Sin detalles proporcionados por la transportadora.'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setSelectedIncident(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors">
                                Cerrar
                            </button>
                            {selectedIncident.chatId && selectedIncident.chatId !== 'AMBIGUOUS_MATCH' && (
                                <button onClick={() => onSelectChat && onSelectChat(selectedIncident.chatId)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors shadow-sm">
                                    <span className="material-symbols-outlined text-lg">chat</span>
                                    Abrir en Chats
                                </button>
                            )}
                            {(!selectedIncident.chatId || selectedIncident.chatId === 'AMBIGUOUS_MATCH') && (
                                <button disabled className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-400 text-sm font-medium rounded-lg cursor-not-allowed">
                                    <span className="material-symbols-outlined text-lg">chat_error</span>
                                    Chat no enlazado
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}`;

content = content.replace(/<\/div>\s*$/, modalHtml + '\n        </div>');

fs.writeFileSync('src/components/Incidents.jsx', content);
console.log("Incidents UI patched with modal");
