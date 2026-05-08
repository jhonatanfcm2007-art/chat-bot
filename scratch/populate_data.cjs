const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../server/data');

const inventory = [
  { id: 1714240000001, service: 'Netflix', email: 'netflix1@test.com', profile: 'Perfil 1', pass: 'nada123', price: 15000, cost: 5000, uses: 3, originalUses: 4, status: 'Available', provider: 'GlobalTech', expiration: '2026-05-27' },
  { id: 1714240000002, service: 'Disney+', email: 'disney@test.com', profile: 'Principal', pass: 'mouse99', price: 12000, cost: 4000, uses: 1, originalUses: 1, status: 'Available', provider: 'StarStream', expiration: '2026-05-15' },
  { id: 1714240000003, service: 'HBO Max', email: 'hbo@test.com', profile: 'Adulto', pass: 'warner00', price: 18000, cost: 6000, uses: 4, originalUses: 5, status: 'Available', provider: 'GlobalTech', expiration: '2026-06-10' }
];

const customerId = '573000000000';
const customerName = 'Juan Pérez';

const chats = {
  [customerId]: {
    customerName: customerName,
    from: customerId,
    tags: ['pagado'],
    updatedAt: Date.now(),
    aiDisabled: false,
    messages: [
      { from: customerId, content: 'Hola, ¿tienes cuentas de Netflix disponibles?', timestampRaw: Date.now() - 3600000 },
      { from: 'me', content: '¡Hola Juan! Sí, tenemos disponibles. El costo es de $15,000 COP por mes.', timestampRaw: Date.now() - 3500000 },
      { from: customerId, content: 'Excelente, ¿cómo puedo pagar?', timestampRaw: Date.now() - 3400000 },
      { from: 'me', content: 'Puedes pagar por Nequi o Daviplata a este número. Una vez pagues, me envías el comprobante.', timestampRaw: Date.now() - 3300000 },
      { from: customerId, content: 'Listo, ya te envié el pago. Adjunto comprobante.', timestampRaw: Date.now() - 2000000 },
      { from: 'me', content: '🎉 ¡Gracias por tu compra de *Netflix*!\n\n*Correo:* netflix1@test.com\n*Contraseña:* nada123\n*Perfil:* Perfil 1\n*Vencimiento:* 2026-05-27\n\n⚠️ Recuerda NO modificar la contraseña ni alterar otros perfiles para mantener tu garantía.', timestampRaw: Date.now() - 1900000 }
    ]
  }
};

const sales = [
  {
    id: 1714240000005,
    reference: 'NETF-2704-1230',
    service: 'Netflix',
    price: 15000,
    cost: 5000,
    provider: 'GlobalTech',
    date: '2026-04-27',
    customer: customerName,
    customerId: customerId,
    email: 'netflix1@test.com',
    pass: 'nada123',
    profile: 'Perfil 1',
    pin: '',
    expiration: '2026-05-27'
  }
];

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

fs.writeFileSync(path.join(DATA_DIR, 'inventory.json'), JSON.stringify(inventory, null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'chats.json'), JSON.stringify(chats, null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'sales.json'), JSON.stringify(sales, null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'platforms.json'), JSON.stringify(['Netflix', 'Disney+', 'HBO Max', 'Spotify'], null, 2));
fs.writeFileSync(path.join(DATA_DIR, 'providers.json'), JSON.stringify(['GlobalTech', 'StarStream', 'DirectX'], null, 2));

console.log('Sample data populated successfully!');
