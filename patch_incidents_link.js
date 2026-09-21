import fs from 'fs';
let content = fs.readFileSync('server/index.js', 'utf8');

const target = `            if (existingIdx !== -1) {`;

const replacement = `            // Link to chatId using phone or sales
            let chatId = null;
            let cleanPhone = (data.phone || '').replace(/\\D/g, '');
            if (cleanPhone.length > 5) {
                // Try to find a chat with this phone
                const possibleChats = Object.keys(chats).filter(c => c.replace(/\\D/g, '').includes(cleanPhone) || cleanPhone.includes(c.replace(/\\D/g, '')));
                if (possibleChats.length === 1) chatId = possibleChats[0];
                else if (possibleChats.length > 1) chatId = 'AMBIGUOUS_MATCH'; // Require manual review
            }
            if (!chatId && data.orderNumber) {
                const sale = sales.find(s => String(s.reference).replace('#', '').trim() === String(data.orderNumber).replace('#', '').trim());
                if (sale) chatId = sale.customerId;
            }
            data.chatId = chatId;

            if (existingIdx !== -1) {`;

content = content.replace(target, replacement);
fs.writeFileSync('server/index.js', content);
console.log("Linking logic added");
