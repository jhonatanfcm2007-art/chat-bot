import fs from 'fs';
let inc = fs.readFileSync('src/components/Incidents.jsx', 'utf8');
const badInc = "<span className={\\`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full \\${inc.internalState === 'Pendiente de contactar' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}\\`}>";
const goodInc = "<span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${inc.internalState === 'Pendiente de contactar' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}>";
inc = inc.replace(badInc, goodInc);
fs.writeFileSync('src/components/Incidents.jsx', inc);
