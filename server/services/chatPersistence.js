import { createHash } from 'node:crypto';

// Keep only fixed-size fingerprints; never queue serialized copies of all chats.
const fingerprint = chat => createHash('sha256').update(JSON.stringify(chat)).digest('hex');

export function createChatPersistence({ getChats, saveChat, saveAll, onError = console.error, delay = 2000, concurrency = 4 }) {
    const hashes = new Map();
    if (saveChat) {
        for (const [id, chat] of Object.entries(getChats())) hashes.set(id, fingerprint(chat));
    }
    let timer = null;
    let running = null;
    let requested = false;

    function schedule() {
        if (timer || running) return;
        timer = setTimeout(() => { timer = null; void flush(); }, delay);
    }

    function request() {
        requested = true;
        schedule();
    }

    async function persist() {
        if (!saveChat) return saveAll(getChats());
        const ids = Object.keys(getChats());
        let cursor = 0;
        async function worker() {
            while (cursor < ids.length) {
                const id = ids[cursor++];
                const chat = getChats()[id];
                if (!chat) continue;
                const hash = fingerprint(chat);
                if (hashes.get(id) === hash) continue;
                try {
                    await saveChat(id, chat);
                    // Only mark persisted after success. Changes during the write
                    // are picked up on the next pass, including metadata changes.
                    hashes.set(id, hash);
                } catch (error) {
                    requested = true;
                    onError(error);
                }
            }
        }
        await Promise.all(Array.from({ length: concurrency }, worker));
        for (const id of hashes.keys()) if (!getChats()[id]) hashes.delete(id);
    }

    function flush() {
        if (timer) { clearTimeout(timer); timer = null; }
        if (running) return running;
        requested = false;
        running = persist().catch(error => {
            requested = true;
            onError(error);
        }).finally(() => {
            running = null;
            if (requested) schedule();
        });
        return running;
    }

    return { request, flush };
}
