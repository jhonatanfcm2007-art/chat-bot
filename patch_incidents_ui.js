import fs from 'fs';
let content = fs.readFileSync('src/components/Incidents.jsx', 'utf8');

const targetState = "const [isSavingClarification, setIsSavingClarification] = useState(false);";
const newState = targetState + "\n    const [isFetchingHistory, setIsFetchingHistory] = useState(false);";
content = content.replace(targetState, newState);

const handleFunc = `
    const handleFetchHistory = async () => {
        if (!selectedIncident) return;
        setIsFetchingHistory(true);
        try {
            const res = await fetch(\`\${BACKEND_URL}/api/incidents/\${selectedIncident.id}/fetch-history\`, {
                method: 'POST'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                // Agregar al historial de aclaraciones de la app para visualización (solo en prueba)
                const newClarifications = data.history.map(h => h.text).join('\\n');
                alert('Conexión exitosa a Soy Drop:\\n' + newClarifications);
            } else {
                alert('Error conectando a Soy Drop: ' + (data.error || 'Desconocido'));
            }
        } catch (e) {
            console.error(e);
            alert('Error de red conectando a Soy Drop.');
        } finally {
            setIsFetchingHistory(false);
        }
    };
`;

const insertTargetHandle = "const handleGenerateDraft = async () => {";
content = content.replace(insertTargetHandle, handleFunc + "\n    " + insertTargetHandle);

// UI Button
const uiTarget = "<p className=\"text-xs font-medium text-slate-400 uppercase tracking-wider mb-1\">Aclaraciones de Soy Drop</p>";
const uiNew = `<div className="flex justify-between items-center mb-1">
                                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Aclaraciones de Soy Drop</p>
                                            <button 
                                                onClick={handleFetchHistory}
                                                disabled={isFetchingHistory}
                                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
                                            >
                                                <span className={"material-symbols-outlined text-[14px]" + (isFetchingHistory ? " animate-spin" : "")}>
                                                    {isFetchingHistory ? 'sync' : 'travel_explore'}
                                                </span>
                                                {isFetchingHistory ? 'Conectando...' : 'Ver historial real'}
                                            </button>
                                        </div>`;

content = content.replace(uiTarget, uiNew);

fs.writeFileSync('src/components/Incidents.jsx', content);
console.log("Patched Incidents.jsx with fetch history button");
