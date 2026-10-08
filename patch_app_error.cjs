const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

code = code.replace(
  "import Simulator from './components/Simulator';", 
  "import Simulator from './components/Simulator';\nimport ErrorBoundary from './components/ErrorBoundary';"
);

code = code.replace(
  /<Simulator([\s\S]*?)\/>/g, 
  '<ErrorBoundary componentName="Simulator"><Simulator$1/></ErrorBoundary>'
);

fs.writeFileSync('src/App.jsx', code);
console.log("App.jsx patched");
