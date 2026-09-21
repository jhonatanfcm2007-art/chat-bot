import React, { useState, useEffect, useRef } from 'react';

function Incidents({ BACKEND_URL, socket, onSelectChat }) {
    const [incidents, setIncidents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const fileInputRef = useRef(null);

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
        });

        return () => {
            socket.off('incidents_updated');
        };
    }, [BACKEND_URL, socket]);

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
        </div>
    );
}

export default Incidents;
