import test from 'node:test';
import assert from 'node:assert/strict';
import { locations, lookupNicaragua, applyNicaraguaCoverage, checkNicaraguaOrder, isNicaragua } from './nicaraguaCoverage.js';

const annotated = (name, text = '¿Cuál es tu nombre?') => {
    const row = locations.find(row => row.locality === name);
    return `${text} [DESTINO_NIC: ${row.id}] [EVIDENCIA_NIC: ${name}]`;
};

test('all 222 source rows obey the owner policy; 74 primary routes allowed', () => {
    assert.equal(locations.length, 222);
    assert.equal(locations.filter(row => row.covered).length, 74);
    for (const row of locations) {
        const expected = ['PRIMARIA A', 'PRIMARIA B'].includes(row.route);
        assert.equal(lookupNicaragua(row.locality).status, expected ? 'covered' : 'uncovered');
        assert.equal(checkNicaraguaOrder({ country: 'NI', city: row.locality, province: row.department }).allowed, expected);
    }
});

test('case and accents normalize; no fuzzy match or department-wide coverage', () => {
    assert.equal(lookupNicaragua('  SEBACO ').status, 'covered');
    assert.equal(lookupNicaragua('Ciudad inexistente', 'Managua').status, 'unknown');
    assert.equal(lookupNicaragua('Sébaco', 'León').status, 'unknown');
    assert.equal(lookupNicaragua('Sebacoo').status, 'unknown');
});

test('excluded locality produces a fixed refusal and removes all order actions', () => {
    const excluded = locations.find(row => !row.covered);
    const chat = { from: '50588888888', city: 'Managua', province: 'Managua' };
    const output = applyNicaraguaCoverage(annotated(excluded.locality, '[ENTREGAR_AHORA] [PRODUCTOS: Producto]'), chat, [`Soy de ${excluded.locality}`]);
    assert.match(output, /no tenemos cobertura/);
    assert.doesNotMatch(output, /\[/);
    assert.equal(checkNicaraguaOrder(chat).allowed, false);
});

test('covered locality fills department, can replace rejected address, and preserves closing', () => {
    const chat = { country: 'NI', nicaraguaCoverage: { status: 'uncovered' } };
    const output = applyNicaraguaCoverage(annotated('Sébaco', '[ENTREGAR_AHORA] [DEPARTAMENTO: Inventado]'), chat, ['Entregar en Sebaco']);
    assert.equal(chat.city, 'Sébaco');
    assert.equal(chat.province, 'Matagalpa');
    assert.match(output, /\[DEPARTAMENTO: Matagalpa\]/);
    assert.doesNotMatch(output, /Inventado|DESTINO_NIC|EVIDENCIA_NIC/);
    assert.equal(checkNicaraguaOrder(chat).allowed, true);
});

test('invented evidence, missing destination and changed city cannot close orders', () => {
    const chat = { country: 'NI' };
    const output = applyNicaraguaCoverage(annotated('Managua', '[ENTREGAR_AHORA]'), chat, ['Hola']);
    assert.match(output, /ciudad o municipio/);
    assert.equal(checkNicaraguaOrder(chat).allowed, false);
    assert.doesNotMatch(applyNicaraguaCoverage('[ENTREGAR_AHORA]', {}, []), /ENTREGAR_AHORA/);
    applyNicaraguaCoverage(annotated('Managua'), chat, ['Managua']);
    assert.doesNotMatch(applyNicaraguaCoverage('[ENTREGAR_AHORA] [MUNICIPIO: Otro]', chat, []), /ENTREGAR_AHORA/);
});

test('existing orders keep support responses; other countries keep order behavior', () => {
    assert.equal(isNicaragua({}, '50588888888_2'), true);
    assert.equal(isNicaragua({ country: 'SV' }, '50388888888'), false);
    assert.equal(checkNicaraguaOrder({ from: '50388888888', city: 'Chalchuapa' }).allowed, true);
    assert.equal(applyNicaraguaCoverage(annotated('Managua', 'Tu pedido sigue en camino.'), { orderRegistered: true }, []), 'Tu pedido sigue en camino.');
});
