import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createHmac, timingSafeEqual, createHash, randomUUID } from 'node:crypto';
const secret = process.env.DROP_WEBHOOK_SECRET;
const directory = process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.RECEIVER_DATA_DIR;
if (!secret || !directory) throw new Error('Required: DROP_WEBHOOK_SECRET and persistent data directory');
fs.mkdirSync(directory, { recursive: true });
const reply = (res, code, value) => { res.writeHead(code, { 'Content-Type':'application/json', 'Cache-Control':'no-store' }); res.end(JSON.stringify(value)); };
http.createServer(async (req, res) => {
    const requestId = randomUUID();
    const startedAt = Date.now();
    const details = { requestId, receivedAt: new Date().toISOString(), method: req.method,
        route: String(req.url || '').split('?')[0].slice(0, 160), result: 'not_found' };
    res.on('finish', () => console.log(JSON.stringify({ ...details, status: res.statusCode, durationMs: Date.now() - startedAt })));
    if (req.method === 'GET' && req.url === '/health') return reply(res,200,{ready:true,version:'1.1.0',mode:'capture-only'});
    const pathname = String(req.url || '').split('?')[0].replace(/\/$/, '');
    if (req.method !== 'POST' || pathname !== '/api/soydrop/webhook') return reply(res,404,{error:'Not found'});
    details.result = 'processing';
    try {
        if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) { details.result='unsupported_content_type'; return reply(res,415,{error:'JSON required'}); }
        let size=0; const chunks=[];
        for await (const chunk of req) { size+=chunk.length; if(size>262144) { reply(res,413,{error:'Too large'});req.resume();return; } chunks.push(chunk); }
        const raw=Buffer.concat(chunks);
        const match=/^t=(\d+),v1=([a-f0-9]{64})$/.exec(req.headers['x-drop-signature'] || '');
        if(!match) { details.result='signature_format'; return reply(res,401,{error:'Invalid signature'}); }
        details.signatureAgeSeconds = Math.round(Date.now()/1000-Number(match[1]));
        if(Math.abs(details.signatureAgeSeconds)>300) { details.result='signature_timestamp'; return reply(res,401,{error:'Invalid signature'}); }
        const expected=createHmac('sha256',secret).update(match[1]+'.').update(raw).digest();
        if(!timingSafeEqual(expected,Buffer.from(match[2],'hex'))) { details.result='signature_mismatch'; return reply(res,401,{error:'Invalid signature'}); }
        let event; try {event=JSON.parse(raw);} catch {return reply(res,400,{error:'Invalid JSON'});}
        if(typeof event.id!=='string' || !event.id || event.id.length>512) return reply(res,400,{error:'Invalid event ID'});
        const safe = value => typeof value === 'string' || typeof value === 'number' ? String(value).slice(0,160) : undefined;
        Object.assign(details, { eventId: safe(event.id), eventType: safe(event.type),
            orderId: safe(event.data?.orderId), orderNumber: safe(event.data?.orderNumber),
            orderStatus: safe(event.data?.status), shipmentNumber: safe(event.data?.shipmentNumber),
            occurredAt: safe(event.data?.occurredAt), result: 'validated' });
        const key=createHash('sha256').update(event.id).digest('hex');
        const target=path.join(directory,key+'.json');
        if(fs.existsSync(target)) { details.result='duplicate'; return reply(res,200,{received:true,duplicate:true}); }
        const temp=path.join(directory,randomUUID()+'.tmp');
        try {
            const fd=fs.openSync(temp,'wx',0o600);
            try {fs.writeFileSync(fd,JSON.stringify({receivedAt:new Date().toISOString(),event}));fs.fsyncSync(fd);} finally {fs.closeSync(fd);}
            fs.renameSync(temp,target);
        } finally {if(fs.existsSync(temp))fs.unlinkSync(temp);}
        details.result='stored';
        reply(res,200,{received:true});
    } catch { details.result='persistence_error'; if(!res.headersSent) reply(res,500,{error:'Unable to persist event'}); }
}).listen(Number(process.env.PORT || 3009),'0.0.0.0',()=>console.log('Capture-only receiver v1.1 ready'));
