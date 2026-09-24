const fs = require('fs');
let code = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

const matchStr = `                           if (order.guideStatus === 'enviada') {
                               statusColor = 'bg-emerald-50 text-emerald-600 border border-emerald-200';
                               statusText = 'o. Gua enviada';`;

const newStr = `                           if (order.guideStatus === 'enviada') {
                               const sentMsg = activeChatData?.messages?.find(m => m.id === order.guideMessageId);
                               if (sentMsg?.status === 'read') {
                                   statusColor = 'bg-blue-50 text-blue-600 border border-blue-200';
                                   statusText = '✓✓ Leído';
                               } else if (sentMsg?.status === 'delivered') {
                                   statusColor = 'bg-emerald-50 text-emerald-600 border border-emerald-200';
                                   statusText = '✓✓ Entregado';
                               } else {
                                   statusColor = 'bg-emerald-50 text-emerald-600 border border-emerald-200';
                                   statusText = '✓ Aceptado (WhatsApp)';
                               }`;

const idx = code.indexOf(`if (order.guideStatus === 'enviada') {`);
if (idx !== -1) {
    const blockEnd = code.indexOf('}', idx);
    const blockStart = code.lastIndexOf('\n', idx);
    const block = code.substring(blockStart, code.indexOf('} else if (order.guideStatus === \'error\')', idx));
    code = code.replace(block, `\n                           if (order.guideStatus === 'enviada') {
                               const sentMsg = activeChatData?.messages?.find(m => m.id === order.guideMessageId);
                               if (sentMsg?.status === 'read') {
                                   statusColor = 'bg-blue-50 text-blue-600 border border-blue-200';
                                   statusText = '✓✓ Leído';
                               } else if (sentMsg?.status === 'delivered') {
                                   statusColor = 'bg-emerald-50 text-emerald-600 border border-emerald-200';
                                   statusText = '✓✓ Entregado';
                               } else {
                                   statusColor = 'bg-emerald-50 text-emerald-600 border border-emerald-200';
                                   statusText = '✓ Aceptado (WhatsApp)';
                               }
`);
}

fs.writeFileSync('src/components/Simulator.jsx', code);
console.log('Fixed statusText');
