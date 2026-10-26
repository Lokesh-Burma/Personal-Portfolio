import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createService, LIMITS, MODEL, buildPrompt, checkPrompt } from '../runtime/service.mjs';
import { Repository, Conflict } from '../runtime/repository.mjs';
import { apiHandler, workerHandler, dispatcherHandler } from '../runtime/handlers.mjs';
import { bedrockProvider, INFERENCE_CONFIG } from '../runtime/aws-provider.mjs';
import { generationQueue } from '../runtime/aws-queue.mjs';
import { catalog } from '../../../portfolio/lib/studio/content.mjs';
class MemoryRepository {
  data = new Map();
  async get(pk,sk) { return structuredClone(this.data.get(pk+'|'+sk)); }
  async query(pk,prefix,cursor,limit=25) {
    const items = [...this.data.values()].filter(x => x.pk === pk && x.sk.startsWith(prefix) && (!cursor || x.sk<cursor)).sort((a,b) => b.sk.localeCompare(a.sk));
    return { Items: structuredClone(items.slice(0,limit)), LastEvaluatedKey: items.length>limit ? { sk: items[limit-1].sk } : undefined };
  }
  async commit(changes) {
    for (const c of changes) {
      const old = this.data.get(c.pk+'|'+c.sk);
      if (c.before ? !old || old.rev !== c.before.rev : old !== undefined) throw new Conflict();
    }
    for (const c of changes) this.data.set(c.pk+'|'+c.sk,structuredClone({ ...c.value, pk: c.pk, sk: c.sk, rev: (c.before?.rev || 0)+1 }));
  }
}
const modelResponse = () => ({ stopReason: 'end_turn', output: { message: { content: [{ text: JSON.stringify(catalog['Cache Aside']) }] } } });
function setup(extra = {}) {
  const repo = new MemoryRepository(), calls = { count: 0, invoke: 0, put: 0, send: [] };
  let current = new Date('2026-10-25T12:00:00Z');
  const options = { repo, now: () => current, enabled: true,
    provider: { count: async () => { calls.count++; return 100; }, invoke: async () => { calls.invoke++; return modelResponse(); } },
    assets: { put: async (owner,id,revision,files) => { calls.put++; assert.equal(Object.keys(files).length,8); assert.match(files['summary.svg'],/Cloud AI draft/); } },
    queue: { send: async (body,key) => calls.send.push({body,key}) }, ...extra };
  const service = createService(options);
  const create = (topic='Cache Aside',key=randomUUID()) => service.create('owner',topic,key);
  const message = j => ({ owner: 'owner', id: j.id, revision: j.revision });
  return { repo, service, calls, create, message, options, clock: date => { current = new Date(date); } };
}
test('atomic idempotency admits one job and rejects conflicting reuse', async () => {
  const s=setup(), key=randomUUID();
  const results=await Promise.all(Array.from({length:4},()=>s.create('Cache Aside',key)));
  assert.equal(new Set(results.map(j=>j.id)).size,1);
  assert.equal((await s.repo.get('OWNER#owner','QUEUE')).count,1);
  assert.equal([...s.repo.data.values()].filter(x=>x.kind==='outbox').length,1);
  await assert.rejects(s.create('Idempotency',key),e=>e.status===409);
});
test('concurrent creation cannot exceed five outstanding jobs', async () => {
  const s=setup();
  const results=await Promise.allSettled(Array.from({length:9},()=>s.create()));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,5);
  assert.equal((await s.repo.get('OWNER#owner','QUEUE')).count,5);
});
test('successful work renders private assets once despite concurrent deliveries', async () => {
  const s=setup(), job=await s.create();
  await Promise.allSettled(Array.from({length:5},()=>s.service.work(s.message(job))));
  await s.service.work(s.message(job));
  const saved=await s.service.get('owner',job.id);
  assert.equal(saved.status,'completed');assert.equal(saved.attempts,1);
  assert.equal(s.calls.invoke,1);assert.equal(s.calls.put,1);
  assert.equal((await s.repo.get('OWNER#owner','QUEUE')).count,0);
  assert.equal((await s.service.quota()).dailyUsed,1);
});
test('daily quota reservation is atomic under contention', async () => {
  const s=setup();
  await s.repo.commit([{pk:'QUOTA#GLOBAL',sk:'DAY#2026-10-25',value:{count:19}}]);
  const jobs=await Promise.all(Array.from({length:4},()=>s.create()));
  await Promise.all(jobs.map(j=>s.service.work(s.message(j))));
  assert.equal(s.calls.invoke,1);
  assert.equal((await s.service.quota()).dailyUsed,20);
  assert.equal((await s.service.quota()).monthlyUsed,1);
});
test('monthly exhaustion blocks inference, survives day rollover and expires by month key', async () => {
  const s=setup();
  await s.repo.commit([{pk:'QUOTA#GLOBAL',sk:'MONTH#2026-10',value:{count:300}}]);
  const job=await s.create();await s.service.work(s.message(job));
  assert.equal(s.calls.invoke,0);assert.equal((await s.service.get('owner',job.id)).status,'failed');
  s.clock('2026-10-26T00:00:01Z');assert.equal((await s.service.quota()).monthlyUsed,300);
  s.clock('2026-11-01T00:00:01Z');assert.equal((await s.service.quota()).monthlyUsed,0);
});
test('timeouts consume reservations and retries are explicit and bounded', async () => {
  const s=setup();s.options.provider.invoke=async()=>{s.calls.invoke++;throw new Error('ambiguous timeout');};
  let job=await s.create();await s.service.work(s.message(job));
  await s.service.work(s.message(job));assert.equal(s.calls.invoke,1);
  const key=randomUUID();job=await s.service.create('owner',undefined,key,job.id);
  assert.equal((await s.service.create('owner',undefined,key,job.id)).revision,1);
  await s.service.work(s.message(job));assert.equal(s.calls.invoke,2);
  assert.equal((await s.service.quota()).dailyUsed,2);
  await assert.rejects(s.service.create('owner',undefined,randomUUID(),job.id),e=>e.status===409);
});
test('interrupted reserved attempts never call the model again', async () => {
  const s=setup(),job=await s.create();
  await s.service.reserve('owner',job.id,0);
  await assert.rejects(s.service.work(s.message(job)),/progress/);
  s.clock('2026-10-25T12:16:00Z');await s.service.work(s.message(job));
  assert.equal(s.calls.invoke,0);assert.equal((await s.service.quota()).dailyUsed,1);
  assert.match((await s.service.get('owner',job.id)).error,/unknown/);
});
test('ambiguous quota commit is redelivered and never followed by a model call', async () => {
  const s=setup(),job=await s.create(),commit=s.repo.commit.bind(s.repo);
  s.repo.commit=async changes=>{await commit(changes);throw new Error('response lost');};
  await assert.rejects(s.service.work(s.message(job)),/response lost/);
  assert.equal(s.calls.invoke,0);assert.equal((await s.service.quota()).dailyUsed,1);
  s.repo.commit=commit;s.clock('2026-10-25T12:16:00Z');await s.service.work(s.message(job));
  assert.equal(s.calls.invoke,0);
});
test('complete prompt byte cap includes UTF-8 and system text before any SDK call', async () => {
  const prompt=buildPrompt('Cache Aside');assert.ok(checkPrompt(prompt)<LIMITS.inputBytes);
  assert.throws(()=>checkPrompt({system:[{text:'x'.repeat(6000)}],messages:[]}),/6000-byte/);
  assert.throws(()=>checkPrompt({system:[],messages:[{text:'漢'.repeat(2100)}]}),/6000-byte/);
  let invoked=false;const provider=bedrockProvider({send:async()=>{invoked=true;}});
  await assert.rejects(provider.invoke({system:[{text:'x'.repeat(6000)}],messages:[]}),/6000-byte/);
  assert.equal(invoked,false);
});
test('invalid or truncated model JSON is never published and remains counted', async () => {
  for (const result of [{...modelResponse(),stopReason:'max_tokens'},{ stopReason:'end_turn',output:{message:{content:[{text:'{"sentence":"no"}'}]}} }]) {
    const s=setup({provider:{count:async()=>100,invoke:async()=>result}}),j=await s.create();
    await s.service.work(s.message(j));
    assert.equal(s.calls.put,0);assert.equal((await s.service.quota()).dailyUsed,1);
    assert.equal((await s.service.get('owner',j.id)).status,'failed');
  }
});
test('outbox redelivery after lost acknowledgement uses the same deduplication key', async () => {
  const s=setup(),j=await s.create(),item=await s.repo.get('OWNER#owner',`OUTBOX#${j.id}#0`),commit=s.repo.commit.bind(s.repo);
  s.repo.commit=async()=>{throw new Error('ack lost');};await assert.rejects(s.service.dispatch(item));
  s.repo.commit=commit;await s.service.dispatch(item);await s.service.dispatch(item);
  assert.equal(s.calls.send.length,2);assert.equal(s.calls.send[0].key,s.calls.send[1].key);
});
test('owner-scoped APIs reject ID tokens, foreign owners, cross-owner jobs and disabled creates', async () => {
  const s=setup(),j=await s.create();
  const assets={urls:async()=>({})};
  const api=apiHandler({service:s.service,assets,owner:'owner',backendReady:true});
  const event=(route,sub='owner',token_use='access')=>({routeKey:route,requestContext:{authorizer:{jwt:{claims:{sub,token_use,scope:'techcanvas/access'}}}},pathParameters:{id:j.id}});
  assert.equal((await api(event('GET /api/jobs','owner','id'))).statusCode,401);
  assert.equal((await api(event('GET /api/jobs','other'))).statusCode,403);
  assert.equal((await api(event('POST /api/jobs'))).statusCode,503);
  const otherApi=apiHandler({service:s.service,assets,owner:'other',backendReady:true});
  assert.equal((await otherApi(event('GET /api/jobs/{id}','other'))).statusCode,404);
  const result=JSON.parse((await api(event('GET /api/jobs'))).body);
  assert.equal(result.jobs.length,1);assert.ok(!Object.hasOwn(result.jobs[0],'pk'));
});
test('partial batch failures are reported and disabled triggers never acknowledge records', async () => {
  const s=setup();
  await assert.rejects(workerHandler({service:s.service,owner:'owner'})({Records:[]}),/disabled/);
  const h=workerHandler({service:s.service,owner:'owner',enabled:true});
  assert.deepEqual(await h({Records:[{messageId:'x',body:'{}',attributes:{MessageGroupId:'other'}}]}),{batchItemFailures:[{itemIdentifier:'x'}]});
  const d=dispatcherHandler({service:s.service,owner:'owner',enabled:true,decode:x=>x});
  assert.deepEqual(await d({Records:[{eventName:'INSERT',dynamodb:{SequenceNumber:'1',NewImage:{kind:'outbox',owner:'other'}}}]}),{batchItemFailures:[{itemIdentifier:'1'}]});
});
test('model and FIFO adapters send fixed bounded SDK commands without automatic retries', async () => {
  const calls=[],provider=bedrockProvider({send:async command=>{calls.push(command);return {inputTokens:10};}});
  await provider.invoke(buildPrompt('Cache Aside'));
  assert.equal(INFERENCE_CONFIG.maxAttempts,1);assert.equal(INFERENCE_CONFIG.region,'ap-southeast-2');
  assert.equal(calls[0].input.modelId,MODEL);assert.equal(calls[0].input.inferenceConfig.maxTokens,LIMITS.output);
  await generationQueue('https://queue', {send:async c=>calls.push(c)}).send({id:'test'},'fixed');
  assert.equal(calls[1].input.MessageGroupId,'owner');assert.equal(calls[1].input.MessageDeduplicationId,'fixed');
});
test('real SDK repository constructs atomic conditional transaction and classifies conflicts', async () => {
  let sent;
  const repo=new Repository({table:'Table',namespace:'TEST#',client:{send:async c=>{sent=c;}}});
  await repo.commit([{pk:'OWNER',sk:'JOB',value:{status:'queued'}},{pk:'QUOTA',sk:'MONTH',before:{rev:3},value:{count:1}}]);
  assert.equal(sent.input.TransactItems.length,2);
  assert.equal(sent.input.TransactItems[0].Put.Item.pk,'TEST#OWNER');
  assert.equal(sent.input.TransactItems[0].Put.ConditionExpression,'attribute_not_exists(pk)');
  assert.equal(sent.input.TransactItems[1].Put.ExpressionAttributeValues[':previous'],3);
  repo.client.send=async()=>{throw Object.assign(new Error(),{name:'TransactionCanceledException',CancellationReasons:[{Code:'ConditionalCheckFailed'}]});};
  await assert.rejects(repo.commit([]),Conflict);
});
