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
    if (req.method === 'GET' && req.url === '/health') return reply(res,200,{ready:true,version:'1.1.0',mode:'capture-only'});
    if (req.method !== 'POST' || req.url !== '/api/soydrop/webhook') return reply(res,404,{error:'Not found'});
    let code=500;
    res.on('finish',()=>console.log(JSON.stringify({receivedAt:new Date().toISOString(),status:res.statusCode})));
    try {
        if (!String(req.headers['content-type'] || '').startsWith('application/json')) return reply(res,415,{error:'JSON required'});
        let size=0; const chunks=[];
        for await (const chunk of req) { size+=chunk.length; if(size>262144) { reply(res,413,{error:'Too large'});req.resume();return; } chunks.push(chunk); }
        const raw=Buffer.concat(chunks);
        const match=/^t=(\d+),v1=([a-f0-9]{64})$/.exec(req.headers['x-drop-signature'] || '');
        if(!match || Math.abs(Date.now()/1000-Number(match[1]))>300) return reply(res,401,{error:'Invalid signature'});
        const expected=createHmac('sha256',secret).update(match[1]+'.').update(raw).digest();
        if(!timingSafeEqual(expected,Buffer.from(match[2],'hex'))) return reply(res,401,{error:'Invalid signature'});
        let event; try {event=JSON.parse(raw);} catch {return reply(res,400,{error:'Invalid JSON'});}
        if(typeof event.id!=='string' || !event.id || event.id.length>512) return reply(res,400,{error:'Invalid event ID'});
        const key=createHash('sha256').update(event.id).digest('hex');
        const target=path.join(directory,key+'.json');
        if(fs.existsSync(target)) return reply(res,200,{received:true,duplicate:true});
        const temp=path.join(directory,randomUUID()+'.tmp');
        try {
            const fd=fs.openSync(temp,'wx',0o600);
            try {fs.writeFileSync(fd,JSON.stringify({receivedAt:new Date().toISOString(),event}));fs.fsyncSync(fd);} finally {fs.closeSync(fd);}
            fs.renameSync(temp,target);
        } finally {if(fs.existsSync(temp))fs.unlinkSync(temp);}
        reply(res,200,{received:true});
    } catch { if(!res.headersSent) reply(res,500,{error:'Unable to persist event'}); }
}).listen(Number(process.env.PORT || 3009),'0.0.0.0',()=>console.log('Capture-only receiver v1.1 ready'));
