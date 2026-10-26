import test from 'node:test';
import assert from 'node:assert/strict';
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { FoundationStack } from '../lib/foundation-stack.mjs';
import { apiHandler, workerHandler, dispatcherHandler } from '../runtime/handlers.mjs';
const app = new App();
const stack = new FoundationStack(app, 'TestFoundation', { env: { region: 'ap-southeast-2' } });
const template = Template.fromStack(stack).toJSON();
const resources = Object.values(template.Resources);
const ofType = type => resources.filter(r => r.Type === type);
test('rejects deployment configuration outside selected Region', () => {
  assert.throws(() => new FoundationStack(new App(), 'Wrong', { env: { region: 'ap-south-1' } }), /Sydney/);
});
test('private encrypted retained storage and on-demand database', () => {
  assert.equal(ofType('AWS::S3::Bucket').length, 3);
  for (const r of ofType('AWS::S3::Bucket')) {
    assert.equal(r.DeletionPolicy, 'Retain');
    assert.ok(Object.values(r.Properties.PublicAccessBlockConfiguration).every(Boolean));
    assert.ok(r.Properties.BucketEncryption);
  }
  assert.equal(ofType('AWS::DynamoDB::Table')[0].Properties.BillingMode, 'PAY_PER_REQUEST');
});
test('every API route requires scoped JWT authentication', () => {
  assert.equal(ofType('AWS::ApiGatewayV2::Api')[0].Properties.Name, 'TechCanvasOwnerApi');
  assert.equal(ofType('AWS::ApiGatewayV2::Route').length, 6);
  for (const r of ofType('AWS::ApiGatewayV2::Route')) {
    assert.equal(r.Properties.AuthorizationType, 'JWT');
    assert.deepEqual(r.Properties.AuthorizationScopes, ['techcanvas/access']);
  }
  assert.equal(ofType('AWS::Cognito::UserPool')[0].Properties.AdminCreateUserConfig.AllowAdminCreateUserOnly, true);
  assert.equal(ofType('AWS::Cognito::UserPool')[0].Properties.MfaConfiguration, 'ON');
  assert.equal(ofType('AWS::Cognito::UserPoolClient')[0].Properties.GenerateSecret, false);
});
test('triggers and inference are disabled with bounded queue configuration', () => {
  const mappings = ofType('AWS::Lambda::EventSourceMapping');
  assert.equal(mappings.length, 2);
  assert.ok(mappings.every(r => r.Properties.Enabled === false));
  const sqs = mappings.find(r => r.Properties.ScalingConfig);
  assert.equal(sqs.Properties.BatchSize, 1);
  assert.equal(sqs.Properties.ScalingConfig.MaximumConcurrency, 2);
  for (const fn of ofType('AWS::Lambda::Function')) {
    assert.equal(fn.Properties.Runtime, 'nodejs24.x');
    assert.equal(fn.Properties.ReservedConcurrentExecutions, undefined, '10-concurrency project cannot reserve Lambda capacity');
    assert.equal(fn.Properties.Environment.Variables.BEDROCK_USAGE_APPROVED, 'false');
    assert.equal(fn.Properties.Environment.Variables.CLOUD_BACKEND_READY, 'true');
  }
  assert.ok(!JSON.stringify(template).includes('bedrock:'));
  assert.ok(!resources.some(r => /AWS::(WAF|EC2|RDS)|AWS::Lambda::Url/.test(r.Type)));
});
test('unconfigured owner and backend gates reject requests before storage', async () => {
  const claims={sub:'owner',token_use:'access',scope:'techcanvas/access'};
  const event={requestContext:{authorizer:{jwt:{claims}}}};
  const closed=apiHandler({service:{},assets:{},owner:'UNCONFIGURED',backendReady:true});
  assert.equal((await closed(event)).statusCode,403);
  const unready=apiHandler({service:{},assets:{},owner:'owner'});
  assert.equal((await unready(event)).statusCode,503);
});
test('inactive consumers fail instead of acknowledging queued work', async () => {
  await assert.rejects(workerHandler({service:{},owner:'owner'})({Records:[{}]}),/disabled/);
  await assert.rejects(dispatcherHandler({service:{},owner:'owner'})({Records:[{}]}),/disabled/);
});
test('stream filters select only real owner outbox INSERT events', () => {
  const mapping=ofType('AWS::Lambda::EventSourceMapping').find(r=>r.Properties.FilterCriteria);
  const pattern=JSON.parse(mapping.Properties.FilterCriteria.Filters[0].Pattern);
  assert.deepEqual(pattern.eventName,['INSERT']);
  assert.deepEqual(pattern.dynamodb.NewImage.kind.S,['outbox']);
  assert.deepEqual(pattern.dynamodb.Keys.pk.S,[{prefix:'OWNER#'}]);
});

test('Go runtime is opt-in, reuses resource identities and keeps inference/triggers disabled', async () => {
  const {mkdtempSync,writeFileSync,rmSync}=await import('node:fs');
  const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const path=mkdtempSync(join(tmpdir(),'go-worker-cdk-'));
  try {
    const binary=Buffer.alloc(64);binary.write('7f454c46',0,'hex');binary[4]=2;binary[5]=1;binary.writeUInt16LE(183,18);writeFileSync(join(path,'bootstrap'),binary);
    const goApp=new App({context:{goWorker:true,goWorkerAssetPath:path}});
    const goStack=new FoundationStack(goApp,'TestFoundation',{env:{region:'ap-southeast-2'}});
    const goTemplate=Template.fromStack(goStack).toJSON();
    assert.deepEqual(Object.keys(goTemplate.Resources),Object.keys(template.Resources));
    const functions=Object.values(goTemplate.Resources).filter(r=>r.Type==='AWS::Lambda::Function');
    const goFunction=functions.find(r=>r.Properties.Runtime==='provided.al2023');
    assert.ok(goFunction);assert.equal(goFunction.Properties.Handler,'bootstrap');assert.equal(goFunction.Properties.Environment.Variables.BEDROCK_USAGE_APPROVED,'false');
    assert.equal(functions.filter(r=>r.Properties.Runtime==='nodejs24.x').length,2);
    assert.ok(Object.values(goTemplate.Resources).filter(r=>r.Type==='AWS::Lambda::EventSourceMapping').every(r=>r.Properties.Enabled===false));
    assert.ok(!JSON.stringify(goTemplate).includes('bedrock:'));
  } finally {rmSync(path,{recursive:true,force:true});}
});

test('common MFA login adds exact callbacks without replacing the pool or client',()=>{
 const commonApp=new App({context:{commonAppOrigin:'https://lokeshburma.com'}});
 const common=Template.fromStack(new FoundationStack(commonApp,'TestFoundation',{env:{region:'ap-southeast-2'}})).toJSON();
 assert.deepEqual(Object.keys(common.Resources),Object.keys(template.Resources));
 const pool=Object.values(common.Resources).find(r=>r.Type==='AWS::Cognito::UserPool');
 assert.equal(pool.Properties.MfaConfiguration,'ON');assert.ok(pool.Properties.EnabledMfas.includes('SOFTWARE_TOKEN_MFA'));
 const client=Object.values(common.Resources).find(r=>r.Type==='AWS::Cognito::UserPoolClient');
 assert.ok(client.Properties.CallbackURLs.includes('https://lokeshburma.com/api/auth/callback'));assert.ok(client.Properties.LogoutURLs.includes('https://lokeshburma.com/'));assert.equal(client.Properties.GenerateSecret,false);assert.deepEqual(client.Properties.AllowedOAuthFlows,['code']);assert.equal(client.Properties.CallbackURLs.length,2);assert.ok(client.Properties.AllowedOAuthScopes.includes('email'));
 assert.ok(!JSON.stringify(common).includes('bedrock:'));assert.ok(Object.values(common.Resources).filter(r=>r.Type==='AWS::Lambda::EventSourceMapping').every(r=>r.Properties.Enabled===false));
 for(const value of ['http://lokeshburma.com','https://lokeshburma.com/','https://evil.test/?redirect=bad'])assert.throws(()=>new FoundationStack(new App({context:{commonAppOrigin:value}}),'BadOrigin',{env:{region:'ap-southeast-2'}}));
});

test('legacy studio entrypoints retire without deleting shared identity, storage or job resources',()=>{
 const a=new App({context:{commonAppOrigin:'https://lokeshburma.com',retireLegacyStudio:true}}),t=Template.fromStack(new FoundationStack(a,'TestFoundation',{env:{region:'ap-southeast-2'}})).toJSON();assert.deepEqual(Object.keys(t.Resources),Object.keys(template.Resources));const all=Object.values(t.Resources);
 assert.equal(all.find(r=>r.Type==='AWS::CloudFront::Distribution').Properties.DistributionConfig.Enabled,false);assert.equal(all.find(r=>r.Type==='AWS::ApiGatewayV2::Api').Properties.DisableExecuteApiEndpoint,true);assert.equal(all.find(r=>r.Type==='AWS::Cognito::UserPool').Properties.MfaConfiguration,'ON');const c=all.find(r=>r.Type==='AWS::Cognito::UserPoolClient').Properties;assert.deepEqual(c.CallbackURLs,['https://lokeshburma.com/api/auth/callback']);assert.deepEqual(c.LogoutURLs,['https://lokeshburma.com/']);for(const r of all.filter(r=>['AWS::DynamoDB::Table','AWS::S3::Bucket','AWS::Cognito::UserPool'].includes(r.Type)))assert.equal(r.DeletionPolicy,'Retain');assert.ok(all.filter(r=>r.Type==='AWS::Lambda::EventSourceMapping').every(r=>r.Properties.Enabled===false));assert.ok(!JSON.stringify(t).includes('bedrock:'));
});
