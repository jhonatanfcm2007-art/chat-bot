import fs from 'fs';
let content = fs.readFileSync('src/components/Incidents.jsx', 'utf8');

const oldButton = `<button 
                                                onClick={handleFetchHistory}
                                                disabled={isFetchingHistory}
                                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
                                            >
                                                <span className={"material-symbols-outlined text-[14px]" + (isFetchingHistory ? " animate-spin" : "")}>
                                                    {isFetchingHistory ? 'sync' : 'travel_explore'}
                                                </span>
                                                {isFetchingHistory ? 'Conectando...' : 'Ver historial real'}
                                            </button>`;

const newButton = `<button 
                                                onClick={() => {
                                                    const url = prompt("Confirma la URL real de inicio de sesión de Soy Drop (ej. https://app.dropi.hn/login):", "https://app.dropi.hn/login");
                                                    if (!url) return;
                                                    const selector = prompt("Ingresa un selector CSS de un elemento EXCLUSIVO del panel autenticado (ej. .sidebar, #user-menu, nav) para comprobar que pasamos el login:", ".sidebar");
                                                    if (!selector) return;
                                                    handleTestAccess(url, selector);
                                                }}
                                                disabled={isFetchingHistory}
                                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors disabled:opacity-50"
                                            >
                                                <span className={"material-symbols-outlined text-[14px]" + (isFetchingHistory ? " animate-spin" : "")}>
                                                    {isFetchingHistory ? 'sync' : 'travel_explore'}
                                                </span>
                                                {isFetchingHistory ? 'Probando...' : 'Probar acceso a Soy Drop'}
                                            </button>`;

content = content.replace(oldButton, newButton);

const oldFunc = /const handleFetchHistory = async \(\) => \{[\s\S]*?setIsFetchingHistory\(false\);\s*\}\s*\};/m;

const newFunc = `const handleTestAccess = async (loginUrl, dashboardSelector) => {
        setIsFetchingHistory(true);
        try {
            const res = await fetch(\`\${BACKEND_URL}/api/incidents/\${selectedIncident.id}/test-access\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loginUrl, dashboardSelector })
            });
            const data = await res.json();
            if (data.success) {
                alert('ÉXITO:\\n' + data.message + '\\nURL Final: ' + data.details.url + '\\nTítulo: ' + data.details.title);
            } else {
                alert('ERROR:\\n' + (data.error || 'Desconocido'));
            }
        } catch (e) {
            console.error(e);
            alert('Error de red conectando al servidor principal.');
        } finally {
            setIsFetchingHistory(false);
        }
    };`;

content = content.replace(oldFunc, newFunc);

fs.writeFileSync('src/components/Incidents.jsx', content);
console.log("Patched UI");
