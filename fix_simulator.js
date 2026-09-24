import fs from 'fs';

let content = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

const updatedHandleFetch = `
  const handleFetchGuides = async () => {
    if (!selectedChat) return alert("Selecciona un chat primero.");
    setIsFetchingGuides(true);
    try {
      const response = await fetch(\`\${serverUrl}/api/fetch-guides\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: selectedChat })
      });
      const data = await response.json();
      if (data.success) {
        alert("¡Guía obtenida y verificada!\\n\\nGuía: " + data.orderData.guide + "\\nTeléfono: " + data.orderData.phone + "\\nEstado: " + data.orderData.status);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      alert('Error de red al invocar /api/fetch-guides.');
    }
    setIsFetchingGuides(false);
  };
`;

content = content.replace(/const handleFetchGuides = async \(\) => \{[\s\S]*?setIsFetchingGuides\(false\);\r?\n\s*\};\r?\n/, updatedHandleFetch);

fs.writeFileSync('src/components/Simulator.jsx', content);
console.log("Simulator updated.");
