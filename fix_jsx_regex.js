import fs from 'fs';
let sim = fs.readFileSync('src/components/Simulator.jsx', 'utf8');
sim = sim.replace(/\/> setInputValue\(e\.target\.value\)\}\s*onKeyDown=\{\(e\) => e\.key === 'Enter' && handleSend\(\)\}\s*\/>/g, '/>');
fs.writeFileSync('src/components/Simulator.jsx', sim);
console.log("Fixed Simulator.jsx with regex");
