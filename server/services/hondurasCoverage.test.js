import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { hnLocations, hnAgencies, hondurasContext, applyHondurasCoverage, checkHondurasOrder, needsHondurasReview, hondurasDeliveryNote } from './hondurasCoverage.js';
import { checkNicaraguaOrder } from './nicaraguaCoverage.js';

function respond(text, tag, chat = { from: '50499999999' }, visible = '[ENTREGAR_AHORA] [PRODUCTOS: Producto] [NOMBRE: Ana]') {
    const context = hondurasContext([text], chat);
    const reply = applyHondurasCoverage(`${visible} ${tag} [EVIDENCIA_HN: ${text}]`, chat, [text], context);
    return { chat, reply, context };
}

test('all coverage rows and both agency sections imported, headers excluded', () => {
    assert.equal(hnLocations.length, 5557);
    assert.equal(hnAgencies.length, 57);
    assert.equal(hnAgencies.filter(a => a.carrier === 'CAEX').length, 44);
    assert.equal(hnAgencies.filter(a => a.carrier === 'FORZA').length, 13);
    const context = hondurasContext(['Entregar en La Ceiba']);
    assert.ok(context.locations.length <= 45);
    assert.ok(context.agencies.length <= 20);
    assert.ok(context.agencies.some(a => a.carrier === 'FORZA'));
});

test('CAEX pickup uses exact source address and never substitutes agency phone for buyer', () => {
    const { chat, reply } = respond('Quiero recoger en agencia CAEX Tela', '[AGENCIA_HN: CAEX-AG-3]');
    const agency = hnAgencies.find(a => a.id === 'CAEX-AG-3');
    assert.equal(chat.address, `CAEX - ${agency.name}: ${agency.address}`);
    assert.equal(chat.orderPhone, undefined);
    assert.equal(checkHondurasOrder(chat).allowed, true);
    assert.equal(needsHondurasReview(chat), true);
    assert.match(reply, /antes del despacho/);
    assert.match(hondurasDeliveryNote(chat), /RETIRO EN AGENCIA CAEX/);
});

test('ambiguous branch or missing pickup consent does not choose a carrier', () => {
    const ambiguous = respond('Quiero recoger en agencia La Ceiba', '[AGENCIA_HN: CAEX-AG-4]');
    assert.equal(ambiguous.chat.hondurasDelivery.status, 'unknown');
    assert.doesNotMatch(ambiguous.reply, /ENTREGAR_AHORA/);
    const noConsent = respond('¿Cuál es la dirección de la agencia CAEX Tela?', '[AGENCIA_HN: CAEX-AG-3]');
    assert.equal(noConsent.chat.hondurasDelivery.status, 'unknown');
});

test('explicit Forza branch preserves Forza automatic route', () => {
    const { chat } = respond('Quiero recoger en agencia Forza La Ceiba', '[AGENCIA_HN: FORZA-AG-62]');
    assert.equal(chat.hondurasDelivery.carrier, 'FORZA');
    assert.equal(needsHondurasReview(chat), false);
    assert.equal(checkHondurasOrder(chat).allowed, true);
});

test('prefer covered Forza even when AI selects CAEX for same place', () => {
    const { chat } = respond('Entregar en Tela Atlantida', '[DESTINO_HN: CAEX-157]');
    assert.equal(chat.hondurasDelivery.carrier, 'FORZA');
    assert.equal(checkHondurasOrder(chat).allowed, true);
});

test('homonyms, unknown locality, and conditions never auto-confirm', () => {
    const ambiguous = respond('Estoy en Agua Caliente', '[DESTINO_HN: CAEX-4]');
    assert.match(ambiguous.reply, /varias localidades/);
    assert.equal(checkHondurasOrder(ambiguous.chat).allowed, false);
    const conditional = respond('Cefalu Jutiapa Atlantida', '[DESTINO_HN: CAEX-79]');
    assert.match(conditional.reply, /Punto de encuentro en parque de Jutiapa/);
    assert.doesNotMatch(conditional.reply, /ENTREGAR_AHORA/);
    assert.equal(checkHondurasOrder(conditional.chat).allowed, false);
    const unknown = respond('Vivo en lugar nuevo', '[DESTINO_HN: DESCONOCIDO]');
    assert.equal(checkHondurasOrder(unknown.chat).allowed, false);
});

test('missing agency city stays for clarification; existing orders remain intact', () => {
    const unresolved = respond('Quiero recoger en agencia CAEX Danli', '[AGENCIA_HN: CAEX-AG-26]');
    assert.equal(unresolved.chat.hondurasDelivery.status, 'review');
    assert.doesNotMatch(unresolved.reply, /ENTREGAR_AHORA/);
    assert.equal(checkHondurasOrder(unresolved.chat).allowed, false);
    const existing = respond('Quiero recoger en agencia CAEX Tela', '[AGENCIA_HN: CAEX-AG-3]', { orderRegistered: true }, 'Tu pedido sigue en camino.');
    assert.equal(existing.reply, 'Tu pedido sigue en camino.');
});

test('changing agency address invalidates dispatch; other countries unaffected', () => {
    const { chat } = respond('Quiero recoger en agencia Forza La Ceiba', '[AGENCIA_HN: FORZA-AG-62]');
    chat.address = 'otra dirección';
    assert.equal(checkHondurasOrder(chat).allowed, false);
    assert.equal(checkHondurasOrder({ from: '50399999999' }).allowed, true);
});

test('real registerOrder retains CAEX in CRM and direct Shopify entry is blocked', async () => {
    const source = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');
    const { chat } = respond('Quiero recoger en agencia CAEX Tela', '[AGENCIA_HN: CAEX-AG-3]');
    Object.assign(chat, { orderName: 'Ana', orderPhone: '50499999999', tags: [] });
    let shopifyCalls = 0;
    const context = { chats: { buyer: chat }, checkNicaraguaOrder, checkHondurasOrder, needsHondurasReview,
        hondurasDeliveryNote, activeOrderCreationLocks: new Set(), saveChats() {}, io: { emit() {} },
        notifyAdmins() {}, console, createShopifyOrder: async () => { shopifyCalls++; } };
    const registerSource = source.slice(source.indexOf('async function registerOrder('), source.indexOf('// --- SHOPIFY INTEGRATION ---'));
    const register = vm.runInNewContext(`${registerSource}\nregisterOrder`, context);
    await register('buyer', 'Producto');
    assert.equal(shopifyCalls, 0);
    assert.equal(chat.shippingReviewRequired, true);
    assert.ok(chat.tags.includes('preparar_pedido'));
    const shopifySource = source.slice(source.indexOf('async function createShopifyOrder('), source.indexOf('// Helper global: detectar'));
    const create = vm.runInNewContext(`${shopifySource}\ncreateShopifyOrder`, { checkNicaraguaOrder, checkHondurasOrder, needsHondurasReview, console });
    const result = await create(chat, 'Producto');
    assert.equal(result.success, false);
});
