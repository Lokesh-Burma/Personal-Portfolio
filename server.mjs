import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store, catalog, assetNames, uploadToS3 } from './core.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export async function createApp({directory=resolve(process.env.DATA_DIR||join(root,'data')),provider=process.env.CONTENT_PROVIDER||'demo',model=process.env.OLLAMA_MODEL||'llama3.2',generator}={}) {
  if(!['demo','ollama'].includes(provider)) throw new Error('CONTENT_PROVIDER must be demo or ollama.');
  const store=await new Store(directory).init();
  const pending=new Set();
  const schedule=id=>{const task=store.run(id,model,generator); pending.add(task); task.finally(()=>pending.delete(task));};
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' blob:; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'");
    res.setHeader('Cache-Control','no-store');
    const send=(code,data,type='application/json')=>{res.writeHead(code,{'Content-Type':type});res.end(type==='application/json'?JSON.stringify(data):data);};
    try {
      // Loopback only; reject DNS rebinding and cross-origin state-changing requests.
      if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host||'')) return send(403,{error:'Local requests only.'});
      if(req.headers.origin && ![`http://${req.headers.host}`].includes(req.headers.origin)) return send(403,{error:'Cross-origin requests are blocked.'});
      const path=new URL(req.url,'http://localhost').pathname;
      if(req.method==='GET' && path==='/api/config') return send(200,{provider,topics:Object.keys(catalog),s3Enabled:process.env.S3_UPLOAD_APPROVED==='true'});
      if(req.method==='GET' && path==='/api/health') return send(200,{ok:true});
      if(req.method==='GET' && path==='/api/jobs') return send(200,{jobs:store.list()});
      if(req.method==='POST' && path==='/api/jobs') {
        if(!(req.headers['content-type']||'').startsWith('application/json')) return send(415,{error:'Use application/json.'});
        let body=''; for await(const chunk of req) {body+=chunk; if(Buffer.byteLength(body)>8192) return send(413,{error:'Request is too large.'});}
        let input; try {input=JSON.parse(body);}catch{return send(400,{error:'Invalid JSON.'});}
        const topic=typeof input?.topic==='string'?input.topic.trim():'';
        if(topic.length<3 || topic.length>120 || /[\x00-\x1f]/.test(topic)) return send(400,{error:'Topic must contain 3–120 characters without control characters.'});
        if(provider==='demo'&&!Object.hasOwn(catalog,topic)) return send(400,{error:'Choose an example topic in demo mode. Configure local Ollama for custom topics.'});
        const key=req.headers['idempotency-key'];
        if(key && (typeof key!=='string'|| !/^[\w-]{1,100}$/.test(key))) return send(400,{error:'Invalid idempotency key.'});
        const {job,fresh}=store.create(topic,provider,key); if(fresh) schedule(job.id);
        return send(fresh?202:200,job);
      }
      const match=path.match(/^\/api\/jobs\/([^/]+)(?:\/(assets\/([^/]+)|retry|s3))?$/);
      if(match && uuid.test(match[1])) {
        const id=match[1],job=store.get(id); if(!job) return send(404,{error:'Job not found.'});
        if(req.method==='GET'&&!match[2]) return send(200,job);
        if(req.method==='GET'&&match[3]&&assetNames.has(match[3])) {
          if(job.status!=='completed') return send(409,{error:'Assets are not ready.'});
          const name=match[3],type=name.endsWith('.svg')?'image/svg+xml':name.endsWith('.json')?'application/json':'text/plain; charset=utf-8';
          const bytes=await store.asset(id,name);
          res.setHeader('Content-Disposition',`${name.endsWith('.svg')?'inline':'attachment'}; filename="${name}"`);
          res.writeHead(200,{'Content-Type':type}); return res.end(bytes);
        }
        if(req.method==='POST'&&match[2]==='retry') {
          if(job.status!=='failed') return send(409,{error:'Only failed jobs can be retried.'});
          if(store.list().filter(j=>['running','queued'].includes(j.status)).length>=5) return send(429,{error:'Generation queue is full.'});
          store.db.prepare("UPDATE jobs SET status='queued',error=NULL WHERE id=?").run(id); schedule(id); return send(202,store.get(id));
        }
        if(req.method==='POST'&&match[2]==='s3') {
          if(process.env.S3_UPLOAD_APPROVED!=='true') return send(403,{error:'S3 uploads are disabled pending approval.'});
          return send(200,await uploadToS3(store,id));
        }
      }
      const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};
      if(req.method==='GET'&&files[path]) return send(200,await readFile(join(root,'public',files[path])),path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html; charset=utf-8');
      send(404,{error:'Not found.'});
    } catch(error) { send(error.status||500,{error:error.status?error.message:'The operation failed. Check local configuration and try again.'}); }
  });
  server.requestTimeout=15000;
  return {server,store,async close(){await new Promise(r=>server.close(r));await Promise.allSettled(pending);store.close();}};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const app=await createApp(); const port=Number(process.env.PORT||4310);
  app.server.listen(port,'127.0.0.1',()=>console.log(`TechCanvas AI: http://127.0.0.1:${port} (${process.env.CONTENT_PROVIDER||'demo'} mode; local only)`));
  for(const signal of ['SIGINT','SIGTERM']) process.once(signal,async()=>{await app.close();process.exit(0);});
}
