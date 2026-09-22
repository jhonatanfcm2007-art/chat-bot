import fs from 'fs';

// 1. Fix Simulator.jsx
let sim = fs.readFileSync('src/components/Simulator.jsx', 'utf8');
const badSim = `                           /> setInputValue(e.target.value)}\n                           onKeyDown={(e) => e.key === 'Enter' && handleSend()}\n                         />`;
sim = sim.replace(badSim, `                           />`);
fs.writeFileSync('src/components/Simulator.jsx', sim);
console.log("Fixed Simulator.jsx");

// 2. Fix Incidents.jsx
let inc = fs.readFileSync('src/components/Incidents.jsx', 'utf8');
// Fix the classname backticks
const badInc = "<span className={\\`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full \\${inc.internalState === 'Pendiente de contactar' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}\\`}>";
const goodInc = "<span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${inc.internalState === 'Pendiente de contactar' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}>";
inc = inc.replace(badInc, goodInc);
fs.writeFileSync('src/components/Incidents.jsx', inc);
console.log("Fixed Incidents.jsx");

