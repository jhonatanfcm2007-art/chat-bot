import fs from 'fs';
let content = fs.readFileSync('src/components/Sidebar.jsx', 'utf8');

if (!content.includes('incidents')) {
    const target = `<SidebarButton id="simulator" icon="chat" label="Chats" activeTab={activeTab} setActiveTab={setActiveTab} />`;
    const replacement = `<SidebarButton id="simulator" icon="chat" label="Chats" activeTab={activeTab} setActiveTab={setActiveTab} />\n      <SidebarButton id="incidents" icon="local_shipping" label="Incidencias" activeTab={activeTab} setActiveTab={setActiveTab} />`;
    content = content.replace(target, replacement);
    fs.writeFileSync('src/components/Sidebar.jsx', content);
    console.log("Sidebar patched");
}
