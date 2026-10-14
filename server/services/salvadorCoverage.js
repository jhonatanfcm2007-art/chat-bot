import fs from 'node:fs';

const catalog = JSON.parse(fs.readFileSync(new URL('../config/salvador-locations.json', import.meta.url), 'utf8'));
export const locations = catalog.locations;
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const byId = new Map(locations.map(row => [String(row.id), row]));
const byName = new Map();
for (const row of locations) {
    const key = normalize(row.locality);
    byName.set(key, [...(byName.get(key) || []), row]);
}

export function isSalvador(chat = {}, phone = '') {
    const country = normalize(chat.country);
    if (country) return ['sv', 'slv', 'el salvador'].includes(country);
    return String(phone || chat.from || '').split('@')[0].split('_')[0].replace(/\D/g, '').startsWith('503');
}

export function lookupSalvador(locality, department = '') {
    const candidates = byName.get(normalize(locality)) || [];
    const matching = department ? candidates.filter(row => normalize(row.department) === normalize(department)) : candidates;
    if (matching.length !== 1) return { status: 'unknown' };
    const row = matching[0];
    return { status: row.covered ? 'covered' : 'uncovered', ...row };
}

export function coverageMessage(result) {
    return result.status === 'uncovered'
        ? `Gracias por tu interés. Por el momento no tenemos cobertura de entrega en ${result.locality}, por lo que no podemos enviar tu pedido a esa localidad.`
        : 'Para verificar si podemos entregarte, ¿en qué ciudad o municipio sería la entrega?';
}

// Built once. No spreadsheet parsing, external lookup, or extra AI request per message.
export const salvadorCoveragePrompt = `
REGLA PRIORITARIA DE UBICACIONES EL SALVADOR: cobertura nacional autorizada.
Este catálogo contiene los nombres exactos que acepta Dropi: ID|Ciudad|Departamento.
Al identificar el destino indicado por el cliente añade [DESTINO_SV: ID] y
[EVIDENCIA_SV: fragmento literal del cliente que menciona la ciudad].
Completa el departamento del catálogo SIN pedirlo otra vez si la ciudad es inequívoca.
Si hay homónimos pide solo una aclaración. No tomes nombres de personas, anuncios,
calles o referencias como destino. Usa la última dirección indicada por el cliente.
Si solo menciona departamento pregunta ciudad, no asumas su cabecera.
Si no puedes identificar ciudad usa [DESTINO_SV: DESCONOCIDO]. No declares que no
hay cobertura: pide aclarar la localidad. No inventes nombre, calle o referencias.
Con nombre, ciudad y dirección suficiente cierra con las etiquetas habituales.
No cambies los tiempos ni precios de los productos. Pedidos existentes: solo postventa.
${locations.map(r => `${r.id}|${r.locality}|${r.department}`).join('\n')}`;

export function applySalvadorCoverage(reply, chat, customerTexts = []) {
    const marker = reply.match(/\[DESTINO_SV:\s*([^\]]+)\]/i);
    const evidence = reply.match(/\[EVIDENCIA_SV:\s*([^\]]+)\]/i)?.[1];
    let clean = reply.replace(/\[(?:DESTINO_SV|EVIDENCIA_SV):[^\]]*\]/gi, '').trim();
    if (chat.orderRegistered || chat.shopifyOrderId || chat.shopifyOrderName) return clean;
    let result;
    if (marker) {
        const row = byId.get(marker[1].trim());
        // A model-selected ID alone is not evidence. Require a literal customer quote
        // containing the locality as a complete phrase (accents/case are normalized).
        const quote = normalize(evidence);
        const supported = row && quote && customerTexts.some(text => normalize(text).includes(quote))
            && (` ${quote} `).includes(` ${normalize(row.locality)} `);
        result = supported ? lookupSalvador(row.locality) : { status: 'unknown' };
        chat.salvadorCoverage = result;
        if (result.status === 'covered') {
            chat.city = result.locality;
            chat.province = result.department;
        }
    }
    const closing = /\[(?:ENTREGAR_AHORA|VERIFICAR_DATOS|CONFIRMACION_AFIRMATIVA|PAGO_PENDIENTE|PEDIDO_PROGRAMADO)\b/i.test(clean)
        || /\*\*Nombre\*\*:/i.test(clean);
    if (result && result.status !== 'covered') return coverageMessage(result);
    if (closing) {
        result ||= chat.salvadorCoverage;
        if (!result || result.status !== 'covered') return coverageMessage(result || { status: 'unknown' });
        const proposedCity = clean.match(/\[MUNICIPIO:\s*([^\]]+)\]/i)?.[1];
        if (proposedCity && normalize(proposedCity) !== normalize(result.locality)) {
            chat.salvadorCoverage = { status: 'unknown' };
            return coverageMessage({ status: 'unknown' });
        }
        // Canonical transport locality/department override model guesses.
        clean = clean.replace(/\[MUNICIPIO:[^\]]*\]/gi, '').replace(/\[DEPARTAMENTO:[^\]]*\]/gi, '');
        clean += ` [MUNICIPIO: ${result.locality}] [DEPARTAMENTO: ${result.department}]`;
    }
    return clean;
}

export function checkSalvadorOrder(chat, phone = '') {
    if (!isSalvador(chat, phone)) return { allowed: true };
    const result = lookupSalvador(chat.city, chat.province);
    // An unresolved or excluded destination found in conversation cannot be bypassed
    // by stale city fields. A new verified destination clears this state.
    const previous = chat.salvadorCoverage;
    const blocked = previous && previous.status !== 'covered';
    return { allowed: !blocked && result.status === 'covered', result,
        error: coverageMessage(blocked ? previous : result) };
}
