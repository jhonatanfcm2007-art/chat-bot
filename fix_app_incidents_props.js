import fs from 'fs';
let content = fs.readFileSync('src/App.jsx', 'utf8');

const target = `<Incidents BACKEND_URL={SERVER_URL} socket={socket} />`;
const replacement = `<Incidents BACKEND_URL={SERVER_URL} socket={socket} onSelectChat={(chatId) => { setSelectedChat(chatId); setActiveTab('simulator'); }} />`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/App.jsx', content);
    console.log("App.jsx updated with Incidents props");
} else {
    console.log("Target not found in App.jsx");
}
