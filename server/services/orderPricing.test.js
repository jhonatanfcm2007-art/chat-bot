import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the actual production parser without starting the server or calling Shopify.
const source = fs.readFileSync(new URL('../index.js', import.meta.url), 'utf8');
const start = source.indexOf('let orderQty = 1;');
const end = source.indexOf('const unitPrice = unitPriceVal.toFixed(2);', start);
function price(targetPricesText, products = 'Combo 2×1') {
    return vm.runInNewContext(`${source.slice(start, end)}; ({ quantity: orderQty, unitPrice: unitPriceVal })`, { targetPricesText, products, chat: { messages: [] }, console });
}
test('Nicaragua screenshot variant: 2 units for 1500 cordobas', () => {
    const result = price('Combo 2×1 por 1500 cordobas');
    assert.equal(result.quantity, 2);
    assert.equal(result.unitPrice, 750);
});
test('Nicaragua default: 2 units for C$ 1,499', () => {
    const result = price('🎁 **Combo 2x1 Tratamiento Completo Purificador: C$ 1,499** por los 2 frascos');
    assert.equal(result.quantity, 2);
    assert.equal(result.unitPrice, 749.5);
});
test('existing Honduras and Salvador formats retain correct totals', () => {
    assert.equal(price('Combo 2×1 por $39,9').unitPrice, 19.95);
    assert.equal(price('Combo 2x1 por L999').unitPrice, 499.5);
});
test('unreadable catalog never silently sends 1 unit at 155', () => {
    assert.throws(() => price('Consultar precio'), /Precio del catálogo no reconocido/);
    assert.throws(() => price(''), /Precio del catálogo no reconocido/);
});
