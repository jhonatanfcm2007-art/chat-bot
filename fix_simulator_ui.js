import fs from 'fs';
let content = fs.readFileSync('src/components/Simulator.jsx', 'utf8');
content = content.replace(
    "{activeChatData.trackingGuide || 'Pendiente'}",
    "{activeChatData.orders && activeChatData.orders.length > 0 ? activeChatData.orders[activeChatData.orders.length - 1].guide : (activeChatData.trackingGuide || 'Pendiente')}"
);
fs.writeFileSync('src/components/Simulator.jsx', content);
console.log("Updated Simulator.jsx trackingGuide UI");
