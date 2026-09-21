import fs from 'fs';
let content = fs.readFileSync('src/components/Incidents.jsx', 'utf8');

const oldHandle = `    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const csvText = event.target.result;
            try {
                const res = await fetch(\`\${BACKEND_URL}/api/incidents/import\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ csvText })
                });
                const result = await res.json();
                if (result.success) {
                    alert(\`Importación exitosa. Nuevas: \${result.newCount}, Actualizadas: \${result.updateCount}\`);
                } else {
                    alert('Error en importación: ' + result.error);
                }
            } catch (err) {
                console.error("Import error:", err);
                alert('Error de red al importar.');
            }
        };
        reader.readAsText(file);
    };`;

const newHandle = `    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target.result;
            try {
                const res = await fetch(\`\${BACKEND_URL}/api/incidents/import\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filename: file.name, base64 })
                });
                const result = await res.json();
                if (result.success) {
                    alert(\`Importación exitosa. Nuevas: \${result.newCount}, Actualizadas: \${result.updateCount}\`);
                } else {
                    alert('Error en importación: ' + result.error);
                }
            } catch (err) {
                console.error("Import error:", err);
                alert('Error de red al importar.');
            }
        };
        reader.readAsDataURL(file);
    };`;

content = content.replace(oldHandle, newHandle);
content = content.replace('accept=".csv"', 'accept=".csv, .xlsx"');
fs.writeFileSync('src/components/Incidents.jsx', content);
console.log("Patched Incidents UI for base64 xlsx");
