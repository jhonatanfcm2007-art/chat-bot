const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

const injection = `
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);

  const handleDiagnoseSync = async () => {
    const user = JSON.parse(localStorage.getItem('crm_user') || '{}');
    if (user.role !== 'admin') return alert('Se requieren permisos de administrador.');
    setIsDiagnosing(true);
    try {
      const response = await fetch(\`\${serverUrl}/api/soydrop/test-sync\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, password: user.password })
      });
      const data = await response.json();
      if (data.success) {
        setDiagnosticResult({ date: new Date().toLocaleString(), stats: data.stats });
      } else {
        alert('Error: ' + data.error);
      }
    } catch (e) {
      alert('Error invocando diagnóstico.');
    }
    setIsDiagnosing(false);
  };

  const handleFetchGuides = async () => {
`;

code = code.replace('const handleFetchGuides = async () => {', injection);
fs.writeFileSync('src/components/Simulator.jsx', code);
