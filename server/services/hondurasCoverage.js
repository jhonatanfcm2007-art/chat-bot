import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync(new URL('../config/honduras-coverage.json', import.meta.url), 'utf8'));
export const hnLocations = data.locations;
export const hnAgencies = data.agencies;
export const normHN = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const phrase = (text, name) => (` ${normHN(text)} `).includes(` ${normHN(name)} `);
const locationIndex = new Map();
const agencyIndex = new Map();
const add = (index, name, row) => {
    const key = normHN(name);
    if (key) index.set(key, [...(index.get(key) || []), row]);
};
for (const row of hnLocations) add(locationIndex, row.locality, row);
for (const row of hnAgencies) {
    add(agencyIndex, row.name, row);
    add(agencyIndex, row.name.replace(/^(agencia\s+(m[oó]vil\s+)?|bodega\s+|cedis\s+|fd ex[ce]\s+)/i, ''), row);
    if (row.city) add(agencyIndex, row.city, row);
}
const rowById = new Map(hnLocations.map(row => [row.id, row]));
const agencyById = new Map(hnAgencies.map(row => [row.id, row]));
export function isHonduras(chat = {}, phone = '') {
    if (chat.country) return ['hn', 'hnd', 'honduras'].includes(normHN(chat.country));
    return String(phone || chat.from || '').replace(/^\+/, '').startsWith('504');
}

export function needsHondurasReview(chat) {
    const state = chat.hondurasDelivery;
    return Boolean(state && state.carrier === 'CAEX');
}

// Index n-grams from recent customer messages; never send 5,557 rows to the model.
export function hondurasContext(texts = [], chat = {}) {
    const found = new Map(), agencies = new Map();
    for (const text of texts.slice(-8)) {
        const words = normHN(text).split(' ');
        for (let start = 0; start < words.length; start++) {
            for (let length = 1; length <= 12 && start + length <= words.length; length++) {
                const key = words.slice(start, start + length).join(' ');
                for (const row of locationIndex.get(key) || []) found.set(row.id, row);
                for (const row of agencyIndex.get(key) || []) agencies.set(row.id, row);
            }
        }
    }
    // Keep the last verified destination available for subsequent name/address replies.
    const saved = rowById.get(chat.hondurasDelivery?.locationId);
    if (saved) found.set(saved.id, saved);
    const savedAgency = agencyById.get(chat.hondurasDelivery?.agencyId);
    if (savedAgency) agencies.set(savedAgency.id, savedAgency);
    const matches = [...found.values()].sort((a, b) => b.locality.length - a.locality.length);
    const branchMatches = [...agencies.values()];
    return { locations: matches.slice(0, 45), agencies: branchMatches.slice(0, 20), truncated: matches.length > 45 || branchMatches.length > 20 };
}

export function hondurasPrompt(context, chat = {}) {
    return `REGLA PRIORITARIA DE ENVÍOS HONDURAS: usamos CAEX (Cargo Expreso) y FORZA.
Solo los registros siguientes son evidencia de cobertura. No interpretes la cobertura
de una cabecera como cobertura de todas sus aldeas. No confundas nombres de personas,
calles, anuncios o referencias con el destino. Usa el último destino que indicó el cliente.
Dropi tiene FORZA predeterminada: prefiere Forza si cubre el destino. Pedidos CAEX
se guardan para carga manual, NO se despachan automáticamente.
Cuando identifiques una localidad agrega [DESTINO_HN: ID] y [EVIDENCIA_HN: cita literal del cliente].
Si no puedes identificarla usa [DESTINO_HN: DESCONOCIDO] y pregunta solo localidad/municipio.
Completa el departamento de una coincidencia inequívoca sin volver a preguntarlo.
Consulta AMBAS transportadoras: sin cobertura en CAEX no implica sin cobertura en Forza.
"conditional" NO significa domicilio: explica literalmente la condición y no confirmes
despacho automático. "unknown" tampoco es cobertura confirmada. No inventes días ni precios.
Para retiro en agencia: solo si el cliente lo pide o acepta, usa [AGENCIA_HN: ID] y
[EVIDENCIA_HN: cita literal donde el cliente elige la agencia]. No decidas por él entre
varias sucursales ni transportadoras. Muestra opciones si hay varias. Usa su dirección
exacta, conserva el teléfono del CLIENTE (el teléfono de agencia es solo información).
Si falta la ciudad de la agencia, pide su municipio para revisión, no inventes.
Antes del cierre con retiro, muestra agencia, transportadora y dirección. No pidas domicilio
particular para retiro en agencia. No digas que está despachado: se verifica la transportadora.
Si cambia a domicilio usa [DESTINO_HN: ID] y deja de usar la agencia anterior.
No apliques esta validación a consultas de pedidos ya registrados.
Estado previo: ${JSON.stringify(chat.hondurasDelivery || null)}
COBERTURAS (id,carrier,department,city,locality,status,condition):
${JSON.stringify(context.locations.map(({ id, carrier, department, city, locality, status, condition }) => ({ id, carrier, department, city, locality, status, condition })))}
AGENCIAS:
${JSON.stringify(context.agencies)}
${context.truncated ? 'Hay más coincidencias: pide precisar municipio/departamento o nombre completo de la agencia; no elijas la primera.' : ''}`;
}

const clarification = 'Para verificar la entrega, ¿en qué municipio y barrio o localidad sería?';
export function applyHondurasCoverage(reply, chat, texts, context) {
    const dest = reply.match(/\[DESTINO_HN:\s*([^\]]+)\]/i)?.[1]?.trim();
    const branch = reply.match(/\[AGENCIA_HN:\s*([^\]]+)\]/i)?.[1]?.trim();
    const quote = reply.match(/\[EVIDENCIA_HN:\s*([^\]]+)\]/i)?.[1];
    let clean = reply.replace(/\[(?:DESTINO_HN|AGENCIA_HN|EVIDENCIA_HN):[^\]]*\]/gi, '').trim();
    if (chat.orderRegistered || chat.shopifyOrderId || chat.shopifyOrderName) return clean;
    const supported = quote && texts.some(text => normHN(text).includes(normHN(quote)));
    if (branch) {
        const agency = context.agencies.find(row => row.id === branch);
        const shortName = agency?.name.replace(/^(agencia\s+(m[oó]vil\s+)?|bodega\s+|cedis\s+|fd ex[ce]\s+)/i, '');
        const choices = context.agencies.filter(row => row.city && phrase(quote, row.city));
        const named = agency && (phrase(quote, agency.name) || phrase(quote, shortName));
        // Generic "agencia Tela" is ambiguous across carriers unless the carrier is stated.
        const carrierNamed = agency && (agency.carrier === 'CAEX' ? /caex|cargo expreso/i.test(quote || '') : /forza/i.test(quote || ''));
        const exactChoices = context.agencies.filter(row => {
            const short = row.name.replace(/^(agencia\s+(m[oó]vil\s+)?|bodega\s+|cedis\s+|fd ex[ce]\s+)/i, '');
            return phrase(quote, short);
        });
        const pickup = texts.some(text => /(?:recoger|retirar|retiro|recogida|envi\w*[^.\n]{0,50}\bagencia)/i.test(text)
            && !/no\s+(?:quiero\s+)?(?:recoger|retirar|retiro)/i.test(text));
        if (!supported || !agency || !pickup || (!named && !(choices.length === 1 && choices[0].id === branch))
            || (exactChoices.length > 1 && !carrierNamed)) {
            chat.hondurasDelivery = { status: 'unknown' };
            return '¿En qué agencia y transportadora deseas recogerlo? Indícame la ciudad y el nombre de la sucursal.';
        }
        chat.hondurasDelivery = { status: agency.city ? 'covered' : 'review', mode: 'agency', agencyId: agency.id, carrier: agency.carrier };
        chat.address = `${agency.carrier} - ${agency.name}: ${agency.address}`;
        chat.province = agency.department;
        chat.city = agency.city || '';
        chat.references = 'Retiro en agencia solicitado por el cliente.';
        if (!agency.city) return `La dirección registrada de ${agency.name} (${agency.carrier}) es: ${agency.address}. ¿En qué municipio está esa sucursal? Necesitamos verificar ese dato antes de registrar el envío.`;
    } else if (dest) {
        const row = context.locations.find(row => row.id === dest);
        if (!row || !supported || !phrase(quote, row.locality)) {
            chat.hondurasDelivery = { status: 'unknown' };
            return clarification;
        }
        const samePlace = hnLocations.filter(other => normHN(other.locality) === normHN(row.locality)
            && normHN(other.city) === normHN(row.city) && normHN(other.department) === normHN(row.department));
        const homonyms = hnLocations.filter(other => normHN(other.locality) === normHN(row.locality));
        const distinctPlaces = new Set(homonyms.map(other => `${normHN(other.department)}|${normHN(other.city)}`));
        if (distinctPlaces.size > 1 && !texts.some(text => phrase(text, row.department) && phrase(text, row.city))) {
            chat.hondurasDelivery = { status: 'unknown' };
            return 'Hay varias localidades con ese nombre. ¿En qué municipio y departamento está la dirección de entrega?';
        }
        const covered = samePlace.find(other => other.status === 'covered' && other.carrier === 'FORZA')
            || samePlace.find(other => other.status === 'covered');
        const chosen = covered || row;
        if (chat.hondurasDelivery?.mode === 'agency') {
            chat.address = '';
            chat.references = '';
        }
        chat.hondurasDelivery = { status: chosen.status, mode: 'home', locationId: chosen.id, carrier: chosen.carrier };
        chat.city = chosen.city;
        chat.province = chosen.department;
        if (chosen.status === 'conditional') return `Para ${chosen.locality}, ${chosen.carrier} indica: ${chosen.condition}. No es una entrega a domicilio confirmada. Podemos revisar una agencia para recoger tu pedido si te sirve esa opción.`;
        if (chosen.status !== 'covered') return 'No tengo entrega a domicilio confirmada para esa localidad en el catálogo. Si deseas, podemos revisar una agencia de Cargo Expreso o Forza para recoger tu pedido.';
    }
    const closing = /\[(?:ENTREGAR_AHORA|VERIFICAR_DATOS|CONFIRMACION_AFIRMATIVA|PAGO_PENDIENTE|PEDIDO_PROGRAMADO)\b|\*\*Nombre\*\*:/i.test(clean);
    if (closing) {
        const state = chat.hondurasDelivery;
        if (!state || state.status !== 'covered') return clarification;
        const proposedCity = clean.match(/\[MUNICIPIO:\s*([^\]]+)\]/i)?.[1];
        if (proposedCity && normHN(proposedCity) !== normHN(chat.city)) return clarification;
        clean = clean.replace(/\[(?:MUNICIPIO|DEPARTAMENTO):[^\]]*\]/gi, '');
        clean += ` [MUNICIPIO: ${chat.city}] [DEPARTAMENTO: ${chat.province}]`;
        if (state.mode === 'agency') {
            const agency = agencyById.get(state.agencyId);
            clean = clean.replace(/\[(?:DIRECCION|REFERENCIAS):[^\]]*\]/gi, '');
            clean += ` [DIRECCION: ${chat.address}] [REFERENCIAS: Retiro en agencia ${agency.carrier}]`;
        }
        if (needsHondurasReview(chat)) {
            const tags = clean.match(/\[[^\]]+\]/g) || [];
            const agency = agencyById.get(state.agencyId);
            const delivery = agency ? `Retiro en ${agency.name} (${agency.carrier}). Dirección: ${agency.address}.` : `Entrega con ${state.carrier} en ${chat.city}.`;
            clean = `Gracias, ya tengo tus datos para registrar el pedido. ${delivery} Un asesor verificará la modalidad de entrega antes del despacho. ${tags.join(' ')}`;
        }
    }
    return clean;
}

export function checkHondurasOrder(chat, phone = '') {
    if (!isHonduras(chat, phone)) return { allowed: true };
    const state = chat.hondurasDelivery;
    if (state?.status !== 'covered') return { allowed: false, error: 'Falta verificar cobertura de Honduras y modalidad de entrega.' };
    const row = state.mode === 'agency' ? agencyById.get(state.agencyId) : rowById.get(state.locationId);
    const valid = row && normHN(chat.city) === normHN(row.city) && normHN(chat.province) === normHN(row.department)
        && (state.mode === 'agency' ? chat.address === `${row.carrier} - ${row.name}: ${row.address}` : row.status === 'covered');
    return { allowed: Boolean(valid), error: valid ? null : 'La dirección cambió: verificar cobertura antes de enviar.' };
}

export function hondurasDeliveryNote(chat) {
    const state = chat.hondurasDelivery;
    if (!state) return '';
    const agency = agencyById.get(state.agencyId);
    return agency ? `RETIRO EN AGENCIA ${agency.carrier}: ${agency.name}. Dirección completa: ${agency.address}. Teléfono agencia: ${agency.phone || 'No indicado'}. Verificar selección de transportadora y modalidad en Dropi.`
        : `Cobertura verificada con ${state.carrier}. Validar esta transportadora en Dropi.`;
}
