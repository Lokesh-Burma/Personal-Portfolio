import test from 'node:test';
import assert from 'node:assert/strict';
import {generationControls,cloudJobInput,cloudRetryInput} from '../lib/studio/activation.mjs';
import {studioCreate,studioRetry,studioConfig} from '../lib/studio/platform.ts';

test('cloud creation and images require independent explicit approval',()=>{
 assert.deepEqual(generationControls({}),{ready:false,imageGeneration:false});
 assert.equal(generationControls({BEDROCK_USAGE_APPROVED:'true'}).ready,false);
 const text=generationControls({TECHCANVAS_JOB_CREATION_APPROVED:'true',BEDROCK_USAGE_APPROVED:'true'});
 assert.deepEqual(cloudJobInput({topic:' Cache Aside '},text),{topic:'Cache Aside',generateImage:false});
 assert.throws(()=>cloudJobInput({topic:'Cache Aside',generateImage:true},text),e=>e.status===503);
 const both=generationControls({TECHCANVAS_JOB_CREATION_APPROVED:'true',BEDROCK_USAGE_APPROVED:'true',TECHCANVAS_IMAGE_CREATION_APPROVED:'true'});
 assert.equal(cloudJobInput({topic:'Cache Aside',generateImage:true},both).generateImage,true);
 for(const input of [null,[],{topic:'x'},{topic:'Cache Aside',owner:'someone'},{topic:'Cache Aside',generateImage:'true'}])assert.throws(()=>cloudJobInput(input,both),e=>e.status===400);
});
test('retry accepts an empty object and never accepts caller-selected job settings',()=>{
 assert.throws(()=>cloudRetryInput({},generationControls({})),e=>e.status===503);
 const ready={ready:true};cloudRetryInput({},ready);
 for(const body of [null,[],{topic:'Cache Aside'},{owner:'other'},{generateImage:true}])assert.throws(()=>cloudRetryInput(body,ready),e=>e.status===400);
});
test('production defaults reject create and retry before cloud storage or credentials are required',async()=>{
 for(const k of ['PLATFORM_LOCAL_DEMO','TECHCANVAS_JOB_CREATION_APPROVED','BEDROCK_USAGE_APPROVED','TECHCANVAS_IMAGE_CREATION_APPROVED','TECHCANVAS_TABLE_NAME','TECHCANVAS_ASSETS_BUCKET','TECHCANVAS_OWNER_SUBJECT'])delete process.env[k];
 assert.equal((await studioConfig()).ready,false);assert.equal((await studioConfig()).imageGeneration,false);
 await assert.rejects(studioCreate({topic:'Cache Aside'},'stable-key'),e=>e.status===503 && /approval/.test(e.message));
 await assert.rejects(studioRetry('invalid',{},'stable-key'),e=>e.status===503 && /approval/.test(e.message));
});
