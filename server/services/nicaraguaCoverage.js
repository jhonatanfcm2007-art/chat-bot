import fs from 'node:fs';

const catalog = JSON.parse(fs.readFileSync(new URL('../config/nicaragua-coverage.json', import.meta.url), 'utf8'));
export const locations = catalog.locations;
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const byId = new Map(locations.map(row => [String(row.id), row]));
const byName = new Map();
for (const row of locations) {
    const key = normalize(row.locality);
    byName.set(key, [...(byName.get(key) || []), row]);
}

export function isNicaragua(chat = {}, phone = '') {
    const country = normalize(chat.country);
    if (country) return ['ni', 'nic', 'nicaragua'].includes(country);
    return String(phone || chat.from || '').split('@')[0].split('_')[0].replace(/\D/g, '').startsWith('505');
}

export function lookupNicaragua(locality, department = '') {
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
export const nicaraguaCoveragePrompt = `
REGLA PRIORITARIA DE COBERTURA PARA NICARAGUA (prevalece sobre envío nacional y cierre):
Solo Cargotrans, rutas PRIMARIA A y PRIMARIA B. No se usa Moovin.
El catálogo inferior tiene formato ID|localidad|departamento del transportista|SI/NO.
Cuando el cliente diga su destino de entrega, agrega [DESTINO_NIC: ID] y
[EVIDENCIA_NIC: fragmento literal del mensaje del cliente que identifica la localidad].
NO tomes la ubicación de un anuncio, de la tienda, de un nombre de persona, de una calle,
de una referencia «carretera a X» ni de algo que tú hayas dicho. Usa el destino más reciente
indicado por el cliente. No escojas una cabecera cubierta para una localidad sin cobertura.
Si no puedes identificar el destino con seguridad usa [DESTINO_NIC: DESCONOCIDO].
Si solo da un departamento, pregunta la ciudad; no asumas que vive en su cabecera.
Si el catálogo dice NO, informa brevemente que no tenemos cobertura allí y no pidas
nombre/dirección ni confirmes o registres el pedido. No ofrezcas otra transportadora.
Si dice SI, completa el departamento del catálogo SIN preguntarlo otra vez y sigue
recogiendo solo nombre y dirección detallada que realmente falten. No inventes datos.
Si un lugar no aparece o es ambiguo, aclara su ciudad/municipio antes de prometer envío.
No prometas cobertura en todo Nicaragua, ni tiempos/tarifas nuevos por este catálogo.
No apliques estas restricciones a preguntas de seguimiento de pedidos ya registrados.
CATÁLOGO:
${locations.map(row => `${row.id}|${row.locality}|${row.department}|${row.covered ? 'SI' : 'NO'}`).join('\n')}`;

export function applyNicaraguaCoverage(reply, chat, customerTexts = []) {
    const marker = reply.match(/\[DESTINO_NIC:\s*([^\]]+)\]/i);
    const evidence = reply.match(/\[EVIDENCIA_NIC:\s*([^\]]+)\]/i)?.[1];
    let clean = reply.replace(/\[(?:DESTINO_NIC|EVIDENCIA_NIC):[^\]]*\]/gi, '').trim();
    if (chat.orderRegistered || chat.shopifyOrderId || chat.shopifyOrderName) return clean;
    let result;
    if (marker) {
        const row = byId.get(marker[1].trim());
        // A model-selected ID alone is not evidence. Require a literal customer quote
        // containing the locality as a complete phrase (accents/case are normalized).
        const quote = normalize(evidence);
        const supported = row && quote && customerTexts.some(text => normalize(text).includes(quote))
            && (` ${quote} `).includes(` ${normalize(row.locality)} `);
        result = supported ? lookupNicaragua(row.locality) : { status: 'unknown' };
        chat.nicaraguaCoverage = result;
        if (result.status === 'covered') {
            chat.city = result.locality;
            chat.province = result.department;
        }
    }
    const closing = /\[(?:ENTREGAR_AHORA|VERIFICAR_DATOS|CONFIRMACION_AFIRMATIVA|PAGO_PENDIENTE|PEDIDO_PROGRAMADO)\b/i.test(clean)
        || /\*\*Nombre\*\*:/i.test(clean);
    if (result && result.status !== 'covered') return coverageMessage(result);
    if (closing) {
        result ||= chat.nicaraguaCoverage;
        if (!result || result.status !== 'covered') return coverageMessage(result || { status: 'unknown' });
        const proposedCity = clean.match(/\[MUNICIPIO:\s*([^\]]+)\]/i)?.[1];
        if (proposedCity && normalize(proposedCity) !== normalize(result.locality)) {
            chat.nicaraguaCoverage = { status: 'unknown' };
            return coverageMessage({ status: 'unknown' });
        }
        // Canonical transport locality/department override model guesses.
        clean = clean.replace(/\[MUNICIPIO:[^\]]*\]/gi, '').replace(/\[DEPARTAMENTO:[^\]]*\]/gi, '');
        clean += ` [MUNICIPIO: ${result.locality}] [DEPARTAMENTO: ${result.department}]`;
    }
    return clean;
}

export function checkNicaraguaOrder(chat, phone = '') {
    if (!isNicaragua(chat, phone)) return { allowed: true };
    const result = lookupNicaragua(chat.city, chat.province);
    // An unresolved or excluded destination found in conversation cannot be bypassed
    // by stale city fields. A new verified destination clears this state.
    const previous = chat.nicaraguaCoverage;
    const blocked = previous && previous.status !== 'covered';
    return { allowed: !blocked && result.status === 'covered', result,
        error: coverageMessage(blocked ? previous : result) };
}
