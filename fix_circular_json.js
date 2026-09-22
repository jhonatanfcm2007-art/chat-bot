import fs from 'fs';
let content = fs.readFileSync('src/components/Incidents.jsx', 'utf8');

// Use a more robust replacement for handleTestAccess
const startIndex = content.indexOf('const handleTestAccess = async');
if (startIndex !== -1) {
    const endIndex = content.indexOf('const handleGenerateDraft = async');
    const oldCode = content.substring(startIndex, endIndex);
    
    const newCode = `const handleTestAccess = async () => {
        setIsFetchingHistory(true);
        try {
            const res = await fetch(\`\${BACKEND_URL}/api/incidents/\${selectedIncident.id}/test-access\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}) // Fix: no enviar objeto circular
            });
            const data = await res.json();
            if (data.success) {
                alert('ÉXITO:\\n' + data.message + '\\nURL Final: ' + data.details.url + '\\nTítulo: ' + data.details.title);
            } else {
                alert('ERROR:\\n' + (data.error || 'Desconocido'));
            }
        } catch (e) {
            console.error(e);
            alert('Error de red al servidor:\\n' + e.message);
        } finally {
            setIsFetchingHistory(false);
        }
    };

    `;
    content = content.replace(oldCode, newCode);
    fs.writeFileSync('src/components/Incidents.jsx', content);
    console.log("Successfully replaced handleTestAccess");
} else {
    console.log("Could not find handleTestAccess");
}
