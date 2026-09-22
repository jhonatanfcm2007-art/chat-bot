import fs from 'fs';

// Patch Simulator.jsx
let sim = fs.readFileSync('src/components/Simulator.jsx', 'utf8');
const simRegex = /alert\('Error al subir la imagen'\);/g;
sim = sim.replace(simRegex, "const errText = await response.text();\n            alert('Error del servidor: ' + errText + ' | Status: ' + response.status);");
fs.writeFileSync('src/components/Simulator.jsx', sim);

// Patch server/index.js
let srv = fs.readFileSync('server/index.js', 'utf8');
const srvRegex = /res\.status\(500\)\.send\('Upload failed'\);/g;
srv = srv.replace(srvRegex, "res.status(500).send('Upload failed: ' + e.message);");
fs.writeFileSync('server/index.js', srv);

console.log("Patched properly");
