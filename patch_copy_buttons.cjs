const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

// Patch 1: Phone number in header
const phoneRegex = /<p className="text-xs font-medium text-on-surface-variant mt-1">\{selectedChat\.split\('_'\)\[0\]\}<\/p>/;
const phoneReplacement = `<div className="flex items-center gap-1 mt-1 justify-center">
              <p className="text-xs font-medium text-on-surface-variant">{selectedChat.split('_')[0]}</p>
              <button 
                 onClick={() => {
                     let clean = selectedChat.split('_')[0].replace(/\\D/g, '');
                     if (clean.startsWith('504') || clean.startsWith('505') || clean.startsWith('502') || clean.startsWith('503') || clean.startsWith('506') || clean.startsWith('507')) clean = clean.substring(3);
                     else if (clean.startsWith('52') || clean.startsWith('57') || clean.startsWith('56')) clean = clean.substring(2);
                     navigator.clipboard.writeText(clean);
                 }}
                 title="Copiar Número (Sin Prefijo)"
                 className="text-slate-400 hover:text-primary transition-colors flex items-center justify-center p-0.5 rounded"
              >
                  <span className="material-symbols-outlined" style={{fontSize: '14px'}}>content_copy</span>
              </button>
            </div>`;

if (phoneRegex.test(code)) {
    code = code.replace(phoneRegex, phoneReplacement);
    console.log("Patched phone copy button!");
} else {
    console.log("Phone regex not found!");
}

// Patch 2: Name in Order Data
const nameRegex = /<span className="text-slate-700">\{activeChatData\.orderName \|\| activeChatData\.customerName \|\| 'No especificado'\}<\/span>/;
const nameReplacement = `<div className="flex items-center gap-1">
                     <span className="text-slate-700">{activeChatData.orderName || activeChatData.customerName || 'No especificado'}</span>
                     <button 
                       onClick={() => navigator.clipboard.writeText(activeChatData.orderName || activeChatData.customerName || 'No especificado')}
                       title="Copiar Nombre"
                       className="text-slate-400 hover:text-primary transition-colors flex items-center justify-center p-0.5 rounded"
                     >
                        <span className="material-symbols-outlined" style={{fontSize: '14px'}}>content_copy</span>
                     </button>
                   </div>`;

if (nameRegex.test(code)) {
    // Only replace the FIRST occurrence (in Nombre), just to be safe, though this exact string might appear again? No, it's specific enough.
    code = code.replace(nameRegex, nameReplacement);
    console.log("Patched name copy button!");
} else {
    console.log("Name regex not found!");
}

fs.writeFileSync('src/components/Simulator.jsx', code);
