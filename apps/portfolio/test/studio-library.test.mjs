import test from 'node:test';
import assert from 'node:assert/strict';
import {createService} from '../lib/studio/service.mjs';
import {Conflict} from '../lib/studio/repository.mjs';
import {refinementInput} from '../lib/studio/pricing.mjs';
class Memory{
 data=new Map();async get(pk,sk){return structuredClone(this.data.get(pk+'|'+sk));}
 async commit(changes){for(const c of changes){const old=this.data.get(c.pk+'|'+c.sk);if(c.before?!old||old.rev!==c.before.rev:old!==undefined)throw new Conflict();}for(const c of changes)this.data.set(c.pk+'|'+c.sk,structuredClone({...c.value,rev:(c.before?.rev||0)+1}));}
}
test('refinement creates one immutable child and cannot use another owner image',async()=>{
 const repo=new Memory(),service=createService({repo});
 const original=await service.create('owner','Cache Aside','original-image-key',undefined,{generateImage:true});
 await repo.commit([{pk:'OWNER#owner',sk:'JOB#'+original.id,before:await service.get('owner',original.id),value:{...original,status:'completed',imageStatus:'completed',assetRevision:0}},{pk:'OWNER#owner',sk:'QUEUE',before:await repo.get('OWNER#owner','QUEUE'),value:{count:0}}]);
 const before=await service.get('owner',original.id);
 const options={generateImage:true,parentId:original.id,instructions:'Fix arrow five'};
 const child=await service.create('owner','Cache Aside','refine-image-key',undefined,options);
 assert.notEqual(child.id,original.id);assert.equal(child.parentId,original.id);assert.equal(child.parentRevision,0);
 assert.equal((await service.create('owner','Cache Aside','refine-image-key',undefined,options)).id,child.id);
 assert.deepEqual(await service.get('owner',original.id),before);
 await assert.rejects(service.create('owner','Cache Aside','refine-image-key',undefined,{...options,instructions:'Different edit'}),e=>e.status===409);
 await assert.rejects(service.create('intruder','Cache Aside','other-owner-key',undefined,options),e=>e.status===409);
});
test('review is metadata-only and usage totals distinguish unknown-cost attempts',async()=>{
 const repo=new Memory(),service=createService({repo,now:()=>new Date('2026-10-30T00:00:00Z')});
 const j=await service.create('owner','Cache Aside','review-original-key');
 const old=await service.get('owner',j.id);await repo.commit([{pk:'OWNER#owner',sk:'JOB#'+j.id,before:old,value:{...old,status:'completed',content:{paragraph:'Preserve me'}}},{pk:'QUOTA#IMAGES',sk:'MONTH#2026-10',value:{count:3,knownCostUSD:0.0439,knownUsageCount:1}},{pk:'QUOTA#IMAGES',sk:'DAY#2026-10-30',value:{count:1}}]);
 const reviewed=await service.review('owner',j.id,true);assert.equal(reviewed.reviewed,true);assert.equal(reviewed.status,'completed');assert.equal(reviewed.content.paragraph,'Preserve me');
 await assert.rejects(service.review('intruder',j.id,true),e=>e.status===409);
 const usage=await service.imageQuota();assert.equal(usage.monthlyUsed,3);assert.equal(usage.unknownCostAttempts,2);assert.equal(usage.knownCostUSD,0.0439);
});
test('refinement instructions reject unknown fields, control characters and UTF-8 overflow',()=>{
 for(const input of [{instructions:'x'},{instructions:'edit\nthis'},{instructions:'界'.repeat(201)},{instructions:'edit',owner:'intruder'},null])assert.throws(()=>refinementInput(input));
 assert.equal(refinementInput({instructions:'  Fix arrow five  '}),'Fix arrow five');
});

test('quota exhaustion blocks new image jobs but preserves an existing idempotent response',async()=>{
 const repo=new Memory(),service=createService({repo,now:()=>new Date('2026-10-30T00:00:00Z')});
 const original=await service.create('owner','Cache Aside','quota-stable-key',undefined,{generateImage:true});
 await repo.commit([{pk:'QUOTA#IMAGES',sk:'DAY#2026-10-30',value:{count:1}}]);
 assert.equal((await service.create('owner','Cache Aside','quota-stable-key',undefined,{generateImage:true})).id,original.id);
 await assert.rejects(service.create('owner','Cache Aside','new-image-quota-key',undefined,{generateImage:true}),e=>e.status===429);
});
