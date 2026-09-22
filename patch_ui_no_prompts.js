import fs from 'fs';
let content = fs.readFileSync('src/components/Incidents.jsx', 'utf8');

// Replace the handleTestAccess function to not take arguments and avoid prompts
const oldFunc = /const handleTestAccess = async \(loginUrl, dashboardSelector\) => \{[\s\S]*?setIsFetchingHistory\(false\);\s*\};/m;
const newFunc = `const handleTestAccess = async () => {
        setIsFetchingHistory(true);
        try {
            const res = await fetch(\`\${BACKEND_URL}/api/incidents/\${selectedIncident.id}/test-access\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}) // Ya no pasamos URL ni selectores desde el cliente
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

// Replace the button onClick
const oldButton = /onClick=\{\(\) => \{[\s\S]*?handleTestAccess\(url, selector\);\s*\}\}/m;
const newButton = `onClick={handleTestAccess}`;
content = content.replace(oldButton, newButton);

fs.writeFileSync('src/components/Incidents.jsx', content);
console.log("Patched UI");
