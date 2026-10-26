import test from 'node:test';
import assert from 'node:assert/strict';
import {createService} from '../lib/studio/service.mjs';
import {Conflict} from '../lib/studio/repository.mjs';
import {privateAssets} from '../lib/studio/aws-assets.mjs';
import {S3Client} from '@aws-sdk/client-s3';
class Memory {
 data=new Map();
 async get(pk,sk){return structuredClone(this.data.get(pk+'|'+sk));}
 async commit(changes){
  for(const c of changes){const old=this.data.get(c.pk+'|'+c.sk);if(c.before?!old || c.before.rev!==old.rev:old!==undefined)throw new Conflict();}
  for(const c of changes)this.data.set(c.pk+'|'+c.sk,structuredClone({...c.value,pk:c.pk,sk:c.sk,rev:(c.before?.rev || 0)+1}));
 }
}
test('image selection survives idempotent creation and outbox dispatch without entering queue payload',async()=>{
 const repo=new Memory(),sent=[],service=createService({repo,queue:{send:async(body,key)=>sent.push({body,key})}});
 const first=await service.create('owner','Cache Aside','stable-image-key',undefined,{generateImage:true});
 const again=await service.create('owner','Cache Aside','stable-image-key',undefined,{generateImage:true});assert.equal(first.id,again.id);assert.equal(first.generateImage,true);
 await assert.rejects(service.create('owner','Cache Aside','stable-image-key'),e=>e.status===409);
 const outbox=[...repo.data.values()].find(v=>v.kind==='outbox');await service.dispatch(outbox);await service.dispatch(outbox);
 assert.equal(sent.length,1);assert.deepEqual(sent[0].body,{owner:'owner',id:first.id,revision:0});assert.equal((await repo.get('OWNER#owner','QUEUE')).count,1);
});
test('explicit retry retains image selection, clears attempt metadata and preserves idempotency',async()=>{
 const repo=new Memory(),service=createService({repo});const j=await service.create('owner','Cache Aside','original-key',undefined,{generateImage:true});
 await repo.commit([{pk:'OWNER#owner',sk:'JOB#'+j.id,before:await service.get('owner',j.id),value:{...j,owner:'owner',status:'failed',imageStatus:'running',imageError:'previous'}},{pk:'OWNER#owner',sk:'QUEUE',before:await repo.get('OWNER#owner','QUEUE'),value:{count:0}}]);
 const retry=await service.create('owner',undefined,'retry-stable-key',j.id);assert.equal(retry.generateImage,true);assert.equal(retry.revision,1);assert.equal(retry.imageStatus,undefined);assert.equal(retry.imageError,undefined);
 assert.equal((await service.create('owner',undefined,'retry-stable-key',j.id)).revision,1);
});
test('legacy Node worker refuses image jobs before calling the text model',async()=>{
 const repo=new Memory();let calls=0;const service=createService({repo,enabled:true,provider:{invoke:async()=>{calls++}}});const j=await service.create('owner','Cache Aside','image-request-key',undefined,{generateImage:true});await service.work({owner:'owner',id:j.id,revision:0});assert.equal(calls,0);assert.equal((await service.get('owner',j.id)).status,'failed');
});
test('private PNG links exist only for completed image stages and expire after five minutes',async()=>{
 const client=new S3Client({region:'ap-southeast-2',credentials:{accessKeyId:'TESTONLY',secretAccessKey:'TESTONLY'}}),assets=privateAssets('private-test-bucket',client);
 const job={id:'job',assetRevision:0,status:'completed'};
 for(const imageStatus of [undefined,'failed','running'])assert.equal((await assets.urls('owner',{...job,imageStatus}))['illustration.png'],undefined);
 const urls=await assets.urls('owner',{...job,imageStatus:'completed'}),u=new URL(urls['illustration.png']);assert.equal(u.searchParams.get('X-Amz-Expires'),'300');assert.equal(u.pathname,'/owners/owner/jobs/job/0/illustration.png');assert.equal(u.searchParams.get('response-content-type'),'image/png');assert.deepEqual(await assets.urls('owner',{...job,status:'running',imageStatus:'completed'}),{});client.destroy();
});
