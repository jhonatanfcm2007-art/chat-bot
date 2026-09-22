import React, { useState, useEffect, useRef } from 'react';

function Incidents({ BACKEND_URL, socket, onSelectChat }) {
    const [incidents, setIncidents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const fileInputRef = useRef(null);

    // Nuevos estados para el borrador
    const [draft, setDraft] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);

    useEffect(() => {
        fetch(`${BACKEND_URL}/api/incidents`)
            .then(res => res.json())
            .then(data => {
                setIncidents(data || []);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error fetching incidents:", err);
                setIsLoading(false);
            });

        socket.on('incidents_updated', (data) => {
            setIncidents(data);
            // Actualizar localmente si el seleccionado cambió
            setSelectedIncident(prev => {
                if (prev) {
                    const updated = data.find(i => i.id === prev.id);
                    return updated || prev;
                }
                return prev;
            });
        });

        return () => {
            socket.off('incidents_updated');
        };
    }, [BACKEND_URL, socket]);

    // Cargar borrador al abrir el modal
    useEffect(() => {
        if (selectedIncident) {
            setDraft(selectedIncident.draftMessage || '');
        } else {
            setDraft('');
        }
    }, [selectedIncident]);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target.result;
            try {
                const res = await fetch(`${BACKEND_URL}/api/incidents/import`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: file.name, base64 })
                });
                const result = await res.json();
                if (result.success) {
                    alert(`Importación exitosa. Nuevas: ${result.newCount}, Actualizadas: ${result.updateCount}`);
                } else {
                    alert('Error en importación: ' + result.error);
                }
            } catch (err) {
                console.error("Import error:", err);
                alert('Error de red al importar.');
            }
        };
        reader.readAsDataURL(file);
    };

    const handleGenerateDraft = async () => {
        if (!selectedIncident) return;
        setIsGenerating(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/incidents/draft/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ incidentId: selectedIncident.id })
            });
            const data = await res.json();
            if (data.draft) {
                setDraft(data.draft);
            } else {
                alert('Error al generar el borrador: ' + (data.error || 'Desconocido'));
            }
        } catch (e) {
            console.error(e);
            alert('Error de red al generar.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveDraft = async () => {
        if (!selectedIncident) return;
        setIsSavingDraft(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/incidents/${selectedIncident.id}/draft`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ draftMessage: draft })
            });
            const data = await res.json();
            if (data.success) {
                setSelectedIncident(data.incident);
                // No mostrar alert para no ser invasivo, pero podrías
            } else {
                alert('Error al guardar borrador.');
            }
        } catch (e) {
            console.error(e);
            alert('Error de red al guardar.');
        } finally {
            setIsSavingDraft(false);
        }
    };

    return (
        <div className="p-6 pb-24 md:pb-6 h-full flex flex-col bg-slate-50 relative custom-scrollbar">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <h1 className="text-lg font-semibold text-on-surface">Módulo de Incidencias (Soy Drop)</h1>
                <div className="flex gap-3">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv, .xlsx" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-100 border border-slate-200 bg-white transition-colors">
                        <span className="material-symbols-outlined text-lg text-emerald-500">upload_file</span>
                        <span className="font-medium text-sm text-on-surface">Importar CSV</span>
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 overflow-y-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Orden</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Motivo</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado CRM</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Chat Asignado</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {incidents.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500">No hay incidencias registradas. Importa un CSV para comenzar.</td></tr>
                            ) : (
                                incidents.map((inc, i) => (
                                    <tr key={inc.id || i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{inc.orderNumber} <br/><span className="text-xs text-slate-500 font-normal">{inc.trackingNumber}</span></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{inc.firstName} {inc.lastName} <br/><span className="text-xs text-slate-500">{inc.phone}</span></td>
                                        <td className="px-6 py-4 text-sm text-slate-700 max-w-xs truncate" title={inc.reason}>{inc.reason || <span className="text-slate-400 italic">Sin motivo especificado</span>}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${inc.internalState === 'Pendiente de contactar' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}>
                                                {inc.internalState}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {inc.chatId === 'AMBIGUOUS_MATCH' ? <span className="text-red-500 font-medium">Revisión manual</span> : (inc.chatId ? 'Asignado' : 'No encontrado')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => setSelectedIncident(inc)} className="text-primary hover:text-primary-hover font-medium bg-primary/5 px-3 py-1.5 rounded-lg transition-colors">
                                                Ver Detalles
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            
            {selectedIncident && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-semibold text-lg text-slate-800">Detalles de la Incidencia</h3>
                            <button onClick={() => setSelectedIncident(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
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
                            
                            {/* SECCIÓN DEL BORRADOR */}
                            {(() => {
                                const isDelivered = selectedIncident.internalState?.toLowerCase().includes('entregado');
                                const isDoubtful = selectedIncident.chatId === 'AMBIGUOUS_MATCH' || !selectedIncident.chatId;
                                const isDraftChanged = draft !== (selectedIncident.draftMessage || '');
                                
                                return (
                                <div className="mt-6 border-t border-slate-100 pt-6">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Borrador de WhatsApp (IA)</h4>
                                        
                                        {isDelivered ? (
                                            <span className="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-100 rounded-md">Bloqueado (Entregado)</span>
                                        ) : isDoubtful ? (
                                            <span className="text-xs text-amber-600 font-medium px-2 py-1 bg-amber-50 rounded-md">Requiere revisión manual</span>
                                        ) : (
                                            <button 
                                                onClick={handleGenerateDraft} 
                                                disabled={isGenerating || isSavingDraft}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                <span className={"material-symbols-outlined text-[16px]" + (isGenerating ? " animate-spin" : "")}>
                                                    {isGenerating ? 'sync' : 'auto_awesome'}
                                                </span>
                                                {isGenerating ? 'Generando...' : 'Preparar mensaje'}
                                            </button>
                                        )}
                                    </div>
                                    
                                    <textarea 
                                        value={draft}
                                        onChange={(e) => setDraft(e.target.value)}
                                        disabled={isDelivered || isDoubtful}
                                        placeholder={isDelivered ? "No se requiere contactar." : isDoubtful ? "Verifica el chat asignado antes de redactar." : "Haz clic en 'Preparar mensaje' o escribe tu borrador aquí..."}
                                        className="w-full h-24 p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none disabled:bg-slate-50 disabled:text-slate-500"
                                    ></textarea>
                                    
                                    {isDraftChanged && !isDelivered && !isDoubtful && (
                                        <div className="flex justify-end mt-2">
                                            <button 
                                                onClick={handleSaveDraft}
                                                disabled={isSavingDraft}
                                                className="px-4 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {isSavingDraft ? 'Guardando...' : 'Guardar borrador'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                );
                            })()}
                            
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setSelectedIncident(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg transition-colors">
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
            )}
        </div>
    );
}

export default Incidents;
