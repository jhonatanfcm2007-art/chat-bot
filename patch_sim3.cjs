const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.jsx', 'utf8');
code = code.replace(
    /\{isFetchingGuides \? 'BUSCANDO\.\.\.' : 'RECOGER GU.?A'\}\s*<\/button>/i,
    "{isFetchingGuides ? 'BUSCANDO...' : 'RECOGER GUÍA'}</button></div>"
);
fs.writeFileSync('src/components/Simulator.jsx', code);
