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

test('image inference is off with no configured image region or model grants',()=>{
 const a=new App(),s=new FoundationStack(a,'ImageSafety',{env:{region:'ap-southeast-2'}}),t=Template.fromStack(s).toJSON();
 for(const r of Object.values(t.Resources).filter(r=>r.Type==='AWS::Lambda::Function')){
  assert.equal(r.Properties.Environment.Variables.BEDROCK_IMAGE_USAGE_APPROVED,'false');assert.equal(r.Properties.Environment.Variables.BEDROCK_IMAGE_REGION,'');
 }
 assert.ok(!JSON.stringify(t).includes('bedrock:InvokeModel'));
});

test('manual image trial allows only fixed models and a single job without enabling event sources',()=>{
 const id='0000000000-22222222-2222-4222-8222-222222222222';
 const a=new App({context:{goWorker:true,manualImageTrialJobId:id}}),s=new FoundationStack(a,'ManualTrial',{env:{region:'ap-southeast-2'}}),t=Template.fromStack(s).toJSON();
 for(const r of Object.values(t.Resources).filter(r=>r.Type==='AWS::Lambda::EventSourceMapping'))assert.equal(r.Properties.Enabled,false);
 const worker=Object.values(t.Resources).find(r=>r.Type==='AWS::Lambda::Function' && r.Properties.Runtime==='provided.al2023');assert.equal(worker.Properties.Environment.Variables.TECHCANVAS_TRIAL_JOB_ID,id);assert.equal(worker.Properties.Environment.Variables.BEDROCK_IMAGE_REGION,'us-west-2');
 const statements=Object.values(t.Resources).filter(r=>r.Type==='AWS::IAM::Policy').flatMap(r=>r.Properties.PolicyDocument.Statement).filter(s=>JSON.stringify(s.Action).includes('bedrock:'));
 assert.equal(statements.length,1);assert.equal(statements[0].Action,'bedrock:InvokeModel');assert.equal(statements[0].Resource.length,2);assert.ok(!JSON.stringify(statements).includes('aws-marketplace:'));
});


test('Nano Banana activation keeps secrets masked, grants only regional text inference and controls both triggers',()=>{
 for(const processingTriggers of [false,true]){
  const a=new App({context:{goWorker:true,nanoBanana:true,processingTriggers}}),t=Template.fromStack(new FoundationStack(a,'TestFoundation',{env:{region:'ap-southeast-2'}})).toJSON();
  assert.deepEqual(Object.keys(t.Resources),Object.keys(template.Resources));assert.equal(t.Parameters.GeminiApiKey.NoEcho,true);
  const f=Object.values(t.Resources).filter(r=>r.Type==='AWS::Lambda::Function'),w=f.find(r=>r.Properties.Runtime==='provided.al2023'),e=w.Properties.Environment.Variables;
  assert.equal(w.Properties.Timeout,180);
  const queue=Object.values(t.Resources).find(r=>r.Type==='AWS::SQS::Queue' && r.Properties.VisibilityTimeout);assert.ok(queue.Properties.VisibilityTimeout>=6*w.Properties.Timeout);
  assert.equal(e.IMAGE_PROVIDER,'gemini');assert.equal(e.GEMINI_IMAGE_USAGE_APPROVED,'true');assert.deepEqual(e.GEMINI_API_KEY,{Ref:'GeminiApiKey'});assert.equal(e.BEDROCK_IMAGE_USAGE_APPROVED,'false');assert.equal(e.GEMINI_IMAGE_REFINEMENT_APPROVED,undefined);
  assert.ok(Object.values(t.Resources).filter(r=>r.Type==='AWS::Lambda::EventSourceMapping').every(r=>r.Properties.Enabled===processingTriggers));
  const invocations=Object.values(t.Resources).filter(r=>r.Type==='AWS::IAM::Policy').flatMap(r=>r.Properties.PolicyDocument.Statement).filter(s=>JSON.stringify(s.Action).includes('bedrock:'));
  assert.equal(invocations.length,1);assert.equal(invocations[0].Action,'bedrock:InvokeModel');assert.ok(JSON.stringify(invocations[0].Resource).includes('amazon.nova-lite-v1:0'));assert.ok(!JSON.stringify(invocations).includes('us-west-2'));
  assert.equal(Object.values(t.Resources).find(r=>r.Type==='AWS::Cognito::UserPool').Properties.MfaConfiguration,'ON');
 }
 assert.throws(()=>new FoundationStack(new App({context:{nanoBanana:true}}),'Bad',{env:{region:'ap-southeast-2'}}),/Go worker/);
 assert.throws(()=>new FoundationStack(new App({context:{processingTriggers:true}}),'Bad',{env:{region:'ap-southeast-2'}}),/configured Nano Banana/);
});
