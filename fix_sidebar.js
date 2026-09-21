import fs from 'fs';
let content = fs.readFileSync('src/components/Sidebar.jsx', 'utf8');

const regex = /{ id: 'simulator', icon: 'chat', label: 'Chats' },/;
const replacement = `{ id: 'simulator', icon: 'chat', label: 'Chats' },\n    { id: 'incidents', icon: 'local_shipping', label: 'Incidencias' },`;

if (content.match(regex)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/components/Sidebar.jsx', content);
    console.log("Sidebar.jsx patched successfully");
} else {
    console.log("Regex not found in Sidebar.jsx");
}
