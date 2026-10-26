// Explicit opt-in integration test against the existing table; never calls Bedrock or S3.
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { Repository } from '../runtime/repository.mjs';
import { createService } from '../runtime/service.mjs';
import { catalog } from '../../content.mjs';
if (!process.env.TECHCANVAS_CONTRACT_TABLE) throw new Error('Set TECHCANVAS_CONTRACT_TABLE to the approved existing Sydney table.');
const namespace='TEST#'+randomUUID()+'#',owner='contract-owner';
const repo=new Repository({table:process.env.TECHCANVAS_CONTRACT_TABLE,namespace});
let calls=0;
const service=createService({repo,enabled:true,now:()=>new Date('2026-10-25T12:00:00Z'),provider:{count:async()=>10,invoke:async()=>{calls++;return {stopReason:'end_turn',output:{message:{content:[{text:JSON.stringify(catalog['Cache Aside'])}]}}};}},assets:{put:async()=>{}}});
try {
  const key=randomUUID(),jobs=await Promise.all([service.create(owner,'Cache Aside',key),service.create(owner,'Cache Aside',key)]);
  assert.equal(jobs[0].id,jobs[1].id);
  await assert.rejects(service.create(owner,'Idempotency',key),e=>e.status===409);
  const second=await service.create(owner,'Cache Aside',randomUUID());
  await repo.commit([{pk:'QUOTA#GLOBAL',sk:'DAY#2026-10-25',value:{count:19}},{pk:'QUOTA#GLOBAL',sk:'MONTH#2026-10',value:{count:299}}]);
  await Promise.all([jobs[0],second].map(j=>service.work({owner,id:j.id,revision:0})));
  assert.equal(calls,1);assert.equal((await service.quota()).dailyUsed,20);assert.equal((await service.quota()).monthlyUsed,300);
  assert.equal(await service.get('different-owner',jobs[0].id),undefined);
  console.log('Live DynamoDB contract passed: idempotency, isolation and concurrent quota boundary. No model or asset calls.');
} finally {
  for (const suffix of ['OWNER#'+owner,'QUOTA#GLOBAL']) {
    const pk=namespace+suffix;let cursor;
    do {
      const page=await repo.client.send(new QueryCommand({TableName:repo.table,KeyConditionExpression:'pk = :pk',ExpressionAttributeValues:{':pk':pk},ConsistentRead:true,ExclusiveStartKey:cursor}));
      for(const item of page.Items||[]) {
        assert.equal(item.pk,pk);assert.ok(item.pk.startsWith(namespace));
        await repo.client.send(new DeleteCommand({TableName:repo.table,Key:{pk:item.pk,sk:item.sk},ConditionExpression:'pk = :pk',ExpressionAttributeValues:{':pk':pk}}));
      }
      cursor=page.LastEvaluatedKey;
    } while(cursor);
  }
  console.log('Removed only this test run’s isolated records.');
}
