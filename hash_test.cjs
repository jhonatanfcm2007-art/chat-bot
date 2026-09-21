const { performance } = require('perf_hooks');
const chats = {};
for(let i=0; i<40000; i++) {
    chats['id'+i] = { 
        messages: Array(10).fill({}), 
        updatedAt: Date.now(), 
        tags: ['a'], 
        assignedProduct: 'b', 
        aiDisabled: false, 
        isBlocked: false 
    };
}
const start = performance.now();
let dirty = 0;
const hashes = {};
for (const id in chats) {
    const chat = chats[id];
    const hash = `${chat.messages?.length || 0}-${chat.updatedAt || 0}-${chat.tags?.length || 0}-${chat.assignedProduct || ''}-${chat.aiDisabled ? 1 : 0}-${chat.isBlocked ? 1 : 0}`;
    if (hashes[id] !== hash) { 
        dirty++; 
        hashes[id] = hash; 
    }
}
console.log('Time:', performance.now() - start, 'ms');
