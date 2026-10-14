import test from 'node:test';
import assert from 'node:assert/strict';
import { createChatPersistence } from './chatPersistence.js';

test('unchanged startup history is not rewritten; changed chats have bounded writes', async () => {
    const chats = Object.fromEntries(Array.from({ length: 1000 }, (_, i) => [String(i), { messages: [], address: 'old' }]));
    let active = 0, peak = 0, writes = 0;
    const persistence = createChatPersistence({ getChats: () => chats, saveChat: async () => {
        active++; peak = Math.max(peak, active); writes++;
        await new Promise(resolve => setImmediate(resolve));
        active--;
    } });
    await persistence.flush();
    assert.equal(writes, 0);
    for (const chat of Object.values(chats)) chat.address = 'new';
    await persistence.flush();
    assert.equal(writes, 1000);
    assert.equal(peak, 4);
    await persistence.flush();
    assert.equal(writes, 1000);
});

test('overlapping requests serialize, preserve in-flight changes, and retry failed writes', async () => {
    const chats = {};
    let release, writes = 0, fail = false;
    const errors = [];
    const saved = [];
    const persistence = createChatPersistence({ getChats: () => chats, delay: 10000,
        onError: error => errors.push(error), saveChat: async (_id, chat) => {
            writes++;
            const snapshot = JSON.stringify(chat);
            if (writes === 1) await new Promise(resolve => { release = resolve; });
            if (fail) throw new Error('temporary failure');
            saved.push(snapshot);
        } });
    chats.a = { address: 'first' };
    const first = persistence.flush();
    chats.a.address = 'second';
    persistence.request();
    assert.equal(persistence.flush(), first);
    assert.equal(writes, 1);
    release();
    await first;
    fail = true;
    await persistence.flush();
    assert.equal(errors.length, 1);
    fail = false;
    await persistence.flush();
    assert.deepEqual(saved.map(value => JSON.parse(value).address), ['first', 'second']);
});

test('file saves also cannot overlap', async () => {
    let release, writes = 0;
    const persistence = createChatPersistence({ getChats: () => ({}), delay: 10000, saveAll: async () => {
        writes++;
        if (writes === 1) await new Promise(resolve => { release = resolve; });
    } });
    const first = persistence.flush();
    persistence.request();
    assert.equal(persistence.flush(), first);
    release();
    await first;
    await persistence.flush();
    assert.equal(writes, 2);
});
