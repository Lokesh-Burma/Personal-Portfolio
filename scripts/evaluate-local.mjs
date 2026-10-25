import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createApp} from '../server.mjs';
import {DEFAULT_MODEL,inspectOllama} from '../ollama-provider.mjs';
import {assetNames} from '../core.mjs';
const model=process.env.OLLAMA_MODEL||DEFAULT_MODEL;
const readiness=await inspectOllama(model);
if(!readiness.ready)throw new Error(readiness.error);
const temporary=await mkdtemp(join(tmpdir(),'techcanvas-live-'));
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=join(root,'data','evaluations');await mkdir(output,{recursive:true});
const app=await createApp({directory:temporary,provider:'ollama',model});
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${app.server.address().port}`;
try{
  const topics=process.argv.slice(2).length?process.argv.slice(2):['Database indexing','Circuit breakers','Consistent hashing'];
  const report=[];
  for(const topic of topics){
    const start=performance.now();
    const created=await fetch(base+'/api/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic})});
    assert.equal(created.status,202);
    const {id}=await created.json();
    let job;
    while(performance.now()-start<130000){
      job=await fetch(`${base}/api/jobs/${id}`).then(r=>r.json());
      if(['failed','completed'].includes(job.status))break;
      await new Promise(r=>setTimeout(r,500));
    }
    assert.equal(job.status,'completed',job.error||'Job did not complete');
    assert.equal(job.provider,'ollama');assert.equal(job.content.concepts.length,3);
    // Focused regression checks for observed failures, not a general fact checker.
    const explanation=[job.content.sentence,job.content.paragraph,...job.content.concepts.map(c=>c.body)].join(' ');
    if(topic.toLowerCase()==='circuit breakers'){
      assert.match(explanation,/half[ -]?open/i);assert.match(explanation,/clos(?:ed|es)/i);
      assert.doesNotMatch(explanation,/backup power|electrical device|fuse box/i);
    }
    if(topic.toLowerCase()==='consistent hashing'){
      assert.match(explanation,/ring/i);assert.match(explanation,/virtual/i);assert.match(explanation,/remap|reassign|redistribut|move/i);
      assert.doesNotMatch(job.content.sentence,/without affecting (?:key )?distribution|same number of keys/i);
    }

    for(const name of assetNames){const asset=await fetch(`${base}/api/jobs/${id}/assets/${name}`);assert.equal(asset.status,200);assert((await asset.text()).length>0);}
    const draft=await fetch(`${base}/api/jobs/${id}/assets/portfolio.json`).then(r=>r.json());assert.equal(draft.status,'draft');
    const item={topic,model,seconds:Number(((performance.now()-start)/1000).toFixed(1)),content:job.content};report.push(item);
    console.log(`${topic}: completed in ${item.seconds}s; 8 assets available; portfolio remains draft.`);
    console.log('Sentence:',job.content.sentence);
  }
  const path=join(output,new Date().toISOString().replaceAll(':','-')+'.json');
  await writeFile(path,JSON.stringify(report,null,2)+'\n');
  console.log('Evaluation report:',path);
}finally{await app.close();await rm(temporary,{recursive:true,force:true});}
