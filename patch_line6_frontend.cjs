const fs = require('fs');

// Patch Header.jsx
let headerCode = fs.readFileSync('src/components/Header.jsx', 'utf8');
const headerFind = "{ val: 5, label: 'Línea 5', icon: 'looks_5' },";
const headerReplace = headerFind + "\n                  { val: 6, label: 'Línea 6', icon: 'looks_6' },";
if (headerCode.includes(headerFind)) {
    headerCode = headerCode.replace(headerFind, headerReplace);
    fs.writeFileSync('src/components/Header.jsx', headerCode);
    console.log('Header.jsx patched');
}

// Patch Sidebar.jsx
let sidebarCode = fs.readFileSync('src/components/Sidebar.jsx', 'utf8');
const sidebarFind = "{ val: 5, label: 'Línea 5', icon: 'looks_5' },";
const sidebarReplace = sidebarFind + "\n                { val: 6, label: 'Línea 6', icon: 'looks_6' },";
if (sidebarCode.includes(sidebarFind)) {
    sidebarCode = sidebarCode.replace(sidebarFind, sidebarReplace);
    fs.writeFileSync('src/components/Sidebar.jsx', sidebarCode);
    console.log('Sidebar.jsx patched');
}
