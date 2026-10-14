export function readOrderSummary(text = '') {
    const fields = {};
    const labels = { nombre: 'name', producto: 'products', productos: 'products', direccion: 'address', municipio: 'city', ciudad: 'city', departamento: 'department', provincia: 'department', telefono: 'phone' };
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^\s*[-*•]?\s*\*\*([^*:]+):?\*\*\s*:?\s*(.+)$/);
        if (!match) continue;
        const key = labels[match[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()];
        if (!key) continue;
        let value = match[2].trim();
        if (key === 'address') {
            while (i + 1 < lines.length && lines[i + 1].trim() && !/^\s*[-*•]?\s*\*\*/.test(lines[i + 1])) value += ' ' + lines[++i].trim();
        }
        fields[key] = value;
    }
    return fields;
}

export function restoreOrderTags(reply) {
    if (/\[ENTREGAR_AHORA\]|\[PEDIDO_PROGRAMADO/i.test(reply)) return reply;
    const f = readOrderSummary(reply);
    if (!f.name || !f.products || !f.address || !/pedido.{0,35}(confirmado|registrado)|gracias por (?:tu|su|la) compra/i.test(reply)) return reply;
    const safe = value => String(value || '').replace(/[\[\]]/g, '');
    return `${reply} [ENTREGAR_AHORA] [PRODUCTOS: ${safe(f.products)}] [NOMBRE: ${safe(f.name)}] [TELEFONO: ${safe(f.phone)}] [DIRECCION: ${safe(f.address)}] [MUNICIPIO: ${safe(f.city)}] [DEPARTAMENTO: ${safe(f.department)}]`;
}
