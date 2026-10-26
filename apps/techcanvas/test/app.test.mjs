import {referenceFor} from '../reference-notes.mjs';
import { requestLocalContent, inspectOllama } from '../ollama-provider.mjs';
import { renderMemorySvg } from '../memory.mjs';
import test from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import { mkdtemp, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server.mjs';
import { Store,catalog,generate,renderSvg,uploadToS3 } from '../core.mjs';
async function fixture(t,options={}){const directory=await mkdtemp(join(tmpdir(),'techcanvas-test-'));const app=await createApp({directory,provider:'demo',...options});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${app.server.address().port}`;t.after(async()=>{await app.close();await rm(directory,{recursive:true,force:true});});return {...app,base,directory};}
async function done(app,id){for(let i=0;i<100;i++){const j=app.store.get(id);if(['completed','failed'].includes(j.status))return j;await new Promise(r=>setTimeout(r,10));}throw new Error('Job never finished');}
const post=(base,data,key)=>fetch(base+'/api/jobs',{method:'POST',headers:{'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})},body:JSON.stringify(data)});
test('HTTP workflow persists content and exports the portfolio draft contract',async t=>{const app=await fixture(t);assert.equal((await fetch(app.base)).status,200);const r=await post(app.base,{topic:'Cache Aside'},'test-key');assert.equal(r.status,202);const job=await done(app,(await r.json()).id);assert.equal(job.status,'completed');assert.match(job.content.paragraph,/TTL/);for(const name of ['summary.svg','memory.svg','concept-1.svg','concept-2.svg','concept-3.svg','caption.txt','blog.md','portfolio.json'])assert.equal((await fetch(`${app.base}/api/jobs/${job.id}/assets/${name}`)).status,200);const exported=await fetch(`${app.base}/api/jobs/${job.id}/assets/portfolio.json`).then(r=>r.json());assert.equal(exported.status,'draft');assert.match(exported.content_markdown,/# Cache Aside/);assert.equal(exported.title,'Cache Aside');assert.equal((await fetch(app.base+'/api/jobs').then(r=>r.json())).jobs.length,1);});
test('idempotency replays requests and rejects conflicting payloads',async t=>{const app=await fixture(t);const a=await post(app.base,{topic:'Idempotency'},'same');const first=await a.json();const b=await post(app.base,{topic:'Idempotency'},'same');assert.equal(b.status,200);assert.equal((await b.json()).id,first.id);assert.equal((await post(app.base,{topic:'Message Queues'},'same')).status,409);});
test('invalid input, unknown assets, cross-origin requests and rebinding are blocked',async t=>{const app=await fixture(t);for(const topic of ['',42,'x'.repeat(121),'Unknown Topic','constructor','__proto__'])assert.equal((await post(app.base,{topic})).status,400);assert.equal((await fetch(app.base+'/api/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:'null'})).status,400);assert.equal((await fetch(app.base+'/api/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'})).status,400);assert.equal((await fetch(app.base+'/api/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(9000)})).status,413);assert.equal((await fetch(app.base+'/api/jobs',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'})).status,403);assert.equal(await new Promise((resolve,reject)=>{const request=http.get(app.base,{headers:{Host:'evil.example'}},r=>{r.resume();resolve(r.statusCode);});request.on('error',reject);}),403);assert.equal((await fetch(app.base+'/api/jobs/not-a-uuid/assets/blog.md')).status,404);assert.equal((await fetch(app.base+'/core.mjs')).status,404);});
test('failed jobs can be retried without silently replacing provider failures',async t=>{let attempts=0;const app=await fixture(t,{generator:async()=>{if(++attempts===1)throw new Error('Model unavailable');return structuredClone(catalog.Idempotency);}});const job=await post(app.base,{topic:'Idempotency'}).then(r=>r.json());assert.equal((await done(app,job.id)).status,'failed');assert.equal((await fetch(`${app.base}/api/jobs/${job.id}/assets/blog.md`)).status,409);assert.equal((await fetch(`${app.base}/api/jobs/${job.id}/retry`,{method:'POST'})).status,202);assert.equal((await done(app,job.id)).status,'completed');assert.equal((await fetch(`${app.base}/api/jobs/${job.id}/retry`,{method:'POST'})).status,409);});
test('SQLite survives restart and marks interrupted jobs for explicit retry',async t=>{const dir=await mkdtemp(join(tmpdir(),'tc-store-'));t.after(()=>rm(dir,{recursive:true,force:true}));let s=await new Store(dir).init();const finished=s.create('Cache Aside','demo').job;await s.run(finished.id);const unfinished=s.create('Idempotency','demo').job;s.close();s=await new Store(dir).init();assert.equal(s.get(finished.id).status,'completed');assert.equal(s.get(unfinished.id).status,'failed');assert.match(s.get(unfinished.id).error,/restart/);s.close();});
test('queue caps concurrent jobs',async t=>{let release;const blocked=new Promise(r=>release=r);const app=await fixture(t,{generator:async()=>{await blocked;return structuredClone(catalog.Idempotency);}});try{for(let i=0;i<5;i++)assert.equal((await post(app.base,{topic:'Idempotency'})).status,202);assert.equal((await post(app.base,{topic:'Idempotency'})).status,429);}finally{release();}});
test('local AI adapter validates structured output and uses only the fixed loopback endpoint',async()=>{let called=false;const c=await generate('Circuit breakers','ollama','test',async(url,options)=>{called=true;assert.equal(url,'http://127.0.0.1:11434/api/generate');assert.equal(JSON.parse(options.body).model,'test');return {ok:true,json:async()=>({response:JSON.stringify(catalog.Idempotency)})};});assert(called);assert.equal(c.concepts.length,3);await assert.rejects(generate('x','ollama','test',async()=>({ok:true,json:async()=>({response:'{}'})})),/invalid/);await assert.rejects(generate('x','paid','test'),/disabled/);});
test('SVG safely escapes model text and produces square images',()=>{const c=structuredClone(catalog.Idempotency);c.concepts[0].title='<script>alert(1)</script>';const svg=renderSvg('A & B',c);assert(!svg.includes('<script>'));assert(svg.includes('&lt;script&gt;'));assert(svg.includes('width="1080" height="1080"'));});
test('S3 default blocks every AWS call; enabled adapter uses private keys and no shell',async t=>{const app=await fixture(t);const job=app.store.create('Cache Aside','demo').job;await app.store.run(job.id);let calls=0;await assert.rejects(uploadToS3(app.store,job.id,{},async()=>calls++),/disabled/);assert.equal(calls,0);assert.equal((await fetch(`${app.base}/api/jobs/${job.id}/s3`,{method:'POST'})).status,403);const r=await uploadToS3(app.store,job.id,{S3_UPLOAD_APPROVED:'true',S3_BUCKET:'test-bucket',AWS_REGION:'ap-south-1'},async(binary,args)=>{calls++;assert.equal(binary,'aws');assert(!args.includes('--acl'));assert(args.some(s=>s.startsWith('s3://test-bucket/techcanvas/')));});assert.equal(calls,8);assert.match(r.prefix,/test-bucket/);});

test('memory diagrams express topic-specific recall cues and escape generated text',()=>{
  for(const [topic,cue] of [['Cache Aside','CHECK → FILL → FORGET'],['Idempotency','SAME KEY → SAME EFFECT'],['Message Queues','SEND → BUFFER → WORK']]) {
    const svg=renderMemorySvg(topic,catalog[topic]);
    assert(svg.includes(cue)); assert(svg.includes('<marker')); assert(svg.includes('aria-labelledby='));
    assert(svg.includes('width="1080" height="1080"'));
  }
  const content=structuredClone(catalog.Idempotency);
  content.concepts[0].title='<script>bad</script>';
  const custom=renderMemorySvg('Custom <topic>',content,'ollama');
  assert(!custom.includes('<script>'));assert(custom.includes('&lt;script&gt;'));assert(custom.includes('Connected ideas, not necessarily a sequence.'));
  assert(renderMemorySvg('Idempotency',content,'ollama').includes('THREE IDEAS. ONE MENTAL MAP.'));
});
test('existing packs receive a memory image without another provider call',async t=>{
  let generations=0;
  const app=await fixture(t,{generator:async()=>{generations++;return structuredClone(catalog['Cache Aside']);}});
  const job=await post(app.base,{topic:'Cache Aside'}).then(r=>r.json());
  await done(app,job.id);
  await unlink(join(app.directory,job.id,'memory.svg'));
  const response=await fetch(`${app.base}/api/jobs/${job.id}/assets/memory.svg`);
  assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/image\/svg/);
  assert.match(await response.text(),/CHECK → FILL → FORGET/);
  assert.equal(generations,1);
  assert.match((await app.store.asset(job.id,'memory.svg')).toString(),/visual memory aid/);
});

test('local model selection rejects cloud models and remote endpoints before fetching',async()=>{
  for(const model of ['llama3.2:cloud','https://ollama.com/model','gpt-oss-cloud','../model','']){
    let calls=0;
    await assert.rejects(requestLocalContent('Databases',model,async()=>calls++),/disabled/);
    assert.equal(calls,0);
  }
});
test('local adapter requests a bounded schema and reports actionable failures',async()=>{
  await requestLocalContent('Circuit breakers','llama3.2:3b',async(url,options)=>{
    const input=JSON.parse(options.body);
    assert.equal(options.redirect,'error');assert.equal(input.format.type,'object');assert.equal(input.format.properties.concepts.maxItems,3);
    assert.equal(input.options.num_ctx,4096);assert.equal(input.keep_alive,'2m');
    return {ok:true,json:async()=>({response:JSON.stringify(catalog.Idempotency)})};
  });
  await assert.rejects(requestLocalContent('x','test',async()=>{throw new Error('ECONNREFUSED');}),/ai:serve/);
  await assert.rejects(requestLocalContent('x','test',async()=>({ok:false,status:404})),/ai:pull/);
  await assert.rejects(requestLocalContent('x','test',async()=>({ok:true,json:async()=>({response:'{',done_reason:'length'})})),/output limit/);
  await assert.rejects(requestLocalContent('x','test',async()=>({ok:true,json:async()=>({response:'{'})})),/invalid JSON/);
  await assert.rejects(requestLocalContent('x','test',async()=>{throw Object.assign(new Error('timeout'),{name:'TimeoutError'});}),/two minutes/);
});
test('readiness distinguishes offline, missing, remote and installed local models',async()=>{
  const offline=await inspectOllama('test',async()=>{throw new Error('offline');});assert.equal(offline.ready,false);assert.match(offline.error,/ai:serve/);
  const missing=await inspectOllama('test',async()=>({ok:true,json:async()=>({models:[]})}));assert.match(missing.error,/ai:pull/);
  assert.equal((await inspectOllama('test',async()=>({ok:true,json:async()=>({models:[{name:'test',remote_host:'https://ollama.com'}]})}))).ready,false);
  assert.equal((await inspectOllama('test',async()=>({ok:true,json:async()=>({models:[{name:'test:latest'}]})}))).ready,true);
});
test('jobs wait in the queue until the previous inference completes',async t=>{
  let release;const wait=new Promise(resolve=>release=resolve);let started=0;
  const app=await fixture(t,{generator:async()=>{started++;await wait;return structuredClone(catalog.Idempotency);}});
  try{
    const first=await post(app.base,{topic:'Idempotency'}).then(r=>r.json());
    const second=await post(app.base,{topic:'Message Queues'}).then(r=>r.json());
    assert.equal(app.store.get(first.id).status,'running');assert.equal(app.store.get(second.id).status,'queued');assert.equal(started,1);
    release();assert.equal((await done(app,second.id)).status,'completed');assert.equal(started,2);
  }finally{release();}
});

test('ambiguous software topics receive reviewed grounding and trusted reference links',async()=>{
  const content=await requestLocalContent('Circuit breakers','test',async(url,options)=>{
    const input=JSON.parse(options.body);
    assert.match(input.prompt,/SOFTWARE resilience pattern/);assert.match(input.prompt,/Half-open/);
    return {ok:true,json:async()=>({response:JSON.stringify({...catalog.Idempotency,sources:[{title:'invented',url:'https://untrusted.example'}]})})};
  });
  assert.equal(content.sources.length,1);assert.match(content.sources[0].url,/learn.microsoft.com/);
});

test('reference lookup treats constructor and prototype names as ordinary custom topics',()=>{
  assert.equal(referenceFor('constructor'),null);assert.equal(referenceFor('__proto__'),null);
  assert.equal(referenceFor('Circuit Breaker').url,referenceFor('Circuit breakers').url);
});
