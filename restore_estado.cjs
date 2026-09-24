const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

const missingBlock = `
                   <div className="pt-3 mt-1 border-t border-slate-100 flex justify-between items-center text-xs">
                     <span className="text-on-surface-variant font-medium">Estado Embudo:</span>
                     <span className={\`px-2 py-1 rounded-md font-semibold \${activeChatData.orderRegistered ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}\`}>
                       {activeChatData.orderRegistered ? '✅ Enviado a WhatsApp' : '⏳ Pendiente de registro'}
                     </span>
                   </div>`;

if (!code.includes('Estado Embudo')) {
    code = code.replace(
        '                 </div>\n              </div>\n\n              {/* Multimedia Gallery */}',
        missingBlock + '\n                 </div>\n              </div>\n\n              {/* Multimedia Gallery */}'
    );
    fs.writeFileSync('src/components/Simulator.jsx', code);
    console.log('Restored Estado block');
} else {
    console.log('Already restored');
}
