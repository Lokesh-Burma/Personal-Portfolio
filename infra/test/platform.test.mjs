import test from 'node:test';
import assert from 'node:assert/strict';
import {App} from 'aws-cdk-lib';
import {Template} from 'aws-cdk-lib/assertions';
import {PlatformData,PlatformPreview} from '../lib/platform.mjs';
const app=new App(),env={region:'ap-southeast-2'},data=new PlatformData(app,'Data',{env}),preview=new PlatformPreview(app,'Preview',{env,data});
const dt=Template.fromStack(data).toJSON(),pt=Template.fromStack(preview).toJSON();const all=[...Object.values(dt.Resources),...Object.values(pt.Resources)];
test('new regional stacks reject other Regions',()=>{assert.throws(()=>new PlatformData(new App(),'Wrong',{env:{region:'ap-south-1'}}),/Sydney/);});
test('stateful data and versioned artifacts are retained and private',()=>{for(const r of Object.values(dt.Resources).filter(r=>['AWS::S3::Bucket','AWS::DynamoDB::Table'].includes(r.Type)))assert.equal(r.DeletionPolicy,'Retain');const table=all.find(r=>r.Type==='AWS::DynamoDB::Table');assert.equal(table.Properties.BillingMode,'PAY_PER_REQUEST');assert.equal(table.Properties.DeletionProtectionEnabled,true);for(const b of all.filter(r=>r.Type==='AWS::S3::Bucket'))assert.ok(Object.values(b.Properties.PublicAccessBlockConfiguration).every(Boolean));});
test('two HTTP services stay single-Region and use correct capped endpoint schema',()=>{const endpoints=all.filter(r=>r.Type==='AWS::Lambda::WebFunctionEndpoint');assert.equal(endpoints.length,2);for(const e of endpoints){assert.equal(e.Properties.EndpointType,'HomeRegion');assert.equal(e.Properties.ScalingConfig.MaxEnvironments,2);assert.equal(e.Properties.ThrottleConfig.RateLimit,100);assert.ok(!e.Properties.Regions);}for(const r of all.filter(r=>r.Type==='AWS::Lambda::WebFunctionRevision'))assert.equal(r.Properties.BuildConfig.RuntimeConfig.Runtime,'nodejs24.x');});
test('owner secrets are API-only and hidden in template parameters',()=>{for(const p of ['AdminEmail','AdminPasswordHash','SessionSecret'])assert.equal(pt.Parameters[p].NoEcho,true);const front=all.find(r=>r.Type==='AWS::Lambda::WebFunctionRevision'&&r.Properties.FunctionName==='lokesh-portfolio');assert.ok(!Object.keys(front.Properties.ServiceConfig.EnvironmentVariables).some(k=>/PASSWORD|SECRET|SUPABASE/.test(k)));});
test('preview does not create an always-on database, VPC, custom certificate, DNS or AI permissions',()=>{assert.ok(!all.some(r=>/AWS::(RDS|EC2|Route53|CertificateManager)|AWS::CloudFront/.test(r.Type)));assert.ok(!JSON.stringify(pt).includes('bedrock:'));});

test('common revision preserves identities, legacy login and scoped storage boundaries',()=>{
 const a=new App({context:{commonApp:true}}),d=new PlatformData(a,'Data',{env}),p=new PlatformPreview(a,'Preview',{env,data:d});
 const t=Template.fromStack(p).toJSON();assert.deepEqual(Object.keys(t.Resources),Object.keys(pt.Resources));
 const revisions=Object.values(t.Resources).filter(r=>r.Type==='AWS::Lambda::WebFunctionRevision');
 const front=revisions.find(r=>r.Properties.FunctionName==='lokesh-portfolio').Properties.ServiceConfig.EnvironmentVariables;
 const api=revisions.find(r=>r.Properties.FunctionName==='lokesh-content-api').Properties.ServiceConfig.EnvironmentVariables;
 assert.ok(front.COGNITO_USER_POOL_ID);assert.ok(front.SESSION_SECRET);assert.ok(!front.ADMIN_PASSWORD_HASH);assert.ok(!front.PORTFOLIO_API_URL);assert.ok(!front.PLATFORM_LOCAL_DEMO);assert.deepEqual(api.CORS_ORIGIN,{Ref:'SiteOrigin'});assert.deepEqual(front.SITE_ORIGIN,{Ref:'CommonSiteOrigin'});assert.deepEqual(api.ADMIN_EMAIL,{Ref:'AdminEmail'});assert.deepEqual(front.ADMIN_EMAIL,{Ref:'CommonOwnerEmail'});assert.equal(t.Parameters.CommonOwnerEmail.NoEcho,true);
 assert.ok(!JSON.stringify(t).includes('bedrock:'));const policies=Object.values(t.Resources).filter(r=>r.Type==='AWS::IAM::Policy');const rolePolicy=policies.find(r=>JSON.stringify(r.Properties.Roles).includes('portfolioRole'));const statements=rolePolicy.Properties.PolicyDocument.Statement;assert.ok(statements.some(s=>JSON.stringify(s.Resource).includes('TechCanvasAssetsBucket')));assert.ok(!statements.some(s=>JSON.stringify(s.Action).includes('s3:PutObject')));
});

test('post-cutover protection closes legacy password access and public preview without removing rollback resources',()=>{
 const a=new App({context:{commonApp:true,protectLegacyApi:true,closeCommonPreview:true}}),d=new PlatformData(a,'Data',{env}),p=new PlatformPreview(a,'Preview',{env,data:d}),t=Template.fromStack(p).toJSON();assert.deepEqual(Object.keys(t.Resources),Object.keys(pt.Resources));for(const r of Object.values(t.Resources).filter(r=>r.Type==='AWS::Lambda::WebFunctionEndpoint'))assert.equal(r.Properties.AuthType,'IamAuth');assert.equal(t.Resources.portfolioRevision.DeletionPolicy,'Retain');
});

test('cloud job writes are opt-in and restricted to the configured owner partition',()=>{
 const a=new App({context:{commonApp:true,cloudJobWrites:true}}),d=new PlatformData(a,'Data',{env}),p=new PlatformPreview(a,'Preview',{env,data:d}),t=Template.fromStack(p).toJSON();
 assert.deepEqual(Object.keys(t.Resources),Object.keys(pt.Resources));
 const policy=Object.values(t.Resources).find(r=>r.Type==='AWS::IAM::Policy' && JSON.stringify(r.Properties.Roles).includes('portfolioRole'));
 const write=policy.Properties.PolicyDocument.Statement.find(s=>s.Action==='dynamodb:PutItem' && JSON.stringify(s.Resource).includes('TechCanvasTableName'));
 assert.ok(write);assert.equal(write.Condition.Null['dynamodb:LeadingKeys'],'false');assert.ok(JSON.stringify(write.Condition['ForAllValues:StringEquals']['dynamodb:LeadingKeys']).includes('TechCanvasOwnerSubject'));
 assert.equal(t.Resources.portfolioRevision.Properties.ServiceConfig.EnvironmentVariables.TECHCANVAS_JOB_CREATION_APPROVED,'false');
 assert.equal(t.Resources.portfolioRevision.Properties.ServiceConfig.EnvironmentVariables.TECHCANVAS_IMAGE_CREATION_APPROVED,'false');
 assert.ok(!JSON.stringify(t).includes('bedrock:'));
});
