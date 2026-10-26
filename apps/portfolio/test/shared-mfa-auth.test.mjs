import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign,createHash} from 'node:crypto';
import {authConfig,beginLogin,consumeFlow,createOwnerVerifiers,verifyOwnerAccess,exchangeCode,safeReturnTo,logoutUrl} from '../lib/auth/cognito.ts';
const config=authConfig({COGNITO_USER_POOL_ID:'ap-southeast-2_LocalPool',COGNITO_CLIENT_ID:'localclient123',COGNITO_LOGIN_DOMAIN:'https://local-test.auth.ap-southeast-2.amazoncognito.com',SITE_ORIGIN:'https://example.test',TECHCANVAS_OWNER_SUBJECT:'11111111-1111-4111-8111-111111111111',ADMIN_EMAIL:'owner@example.test',SESSION_SECRET:'local-signing-secret-with-more-than-32-characters'});
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwk={...publicKey.export({format:'jwk'}),kid:'local-key',alg:'RS256',use:'sig'};
const verifiers=createOwnerVerifiers(config);verifiers.access.cacheJwks({keys:[jwk]});verifiers.id.cacheJwks({keys:[jwk]});
function jwt(claims){const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const message=encode({alg:'RS256',kid:'local-key'})+'.'+encode(claims);return message+'.'+sign('RSA-SHA256',Buffer.from(message),privateKey).toString('base64url');}
const now=()=>Math.floor(Date.now()/1000);
const access=extra=>jwt({iss:'https://cognito-idp.ap-southeast-2.amazonaws.com/'+config.pool,token_use:'access',client_id:config.client,sub:config.owner,scope:'openid techcanvas/access',iat:now(),exp:now()+3600,...extra});
const id=(nonce,extra)=>jwt({iss:'https://cognito-idp.ap-southeast-2.amazonaws.com/'+config.pool,token_use:'id',aud:config.client,sub:config.owner,email:config.email,email_verified:true,nonce,iat:now(),exp:now()+3600,...extra});
test('sign-in uses PKCE S256, nonce, signed expiring state and local return paths only',()=>{
 const start=beginLogin(config,'/techcanvas/studio'),url=new URL(start.url),flow=consumeFlow(start.cookie,url.searchParams.get('state'),config);
 assert.equal(url.origin,config.domain);assert.ok(url.searchParams.get('scope').split(' ').includes('email'));assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('code_challenge'),createHash('sha256').update(flow.verifier).digest('base64url'));assert.equal(url.searchParams.get('nonce'),flow.nonce);assert.equal(url.searchParams.get('redirect_uri'),'https://example.test/api/auth/callback');
 for(const [cookie,state,time] of [[undefined,flow.state,Date.now()],[start.cookie,'wrong',Date.now()],[start.cookie,flow.state,Date.now()+600001],[start.cookie,flow.state,flow.created-1],[start.cookie+'.extra',flow.state,Date.now()]])assert.throws(()=>consumeFlow(cookie,state,config,time));
 for(const path of ['https://evil.test','//evil.test','/admin?next=evil','/api/admin/blogs'])assert.equal(safeReturnTo(path),'/admin');assert.equal(flow.returnTo,'/techcanvas/studio');
});
test('real RSA/JWKS verification checks owner, issuer, client, token use, scope and lifetime',async()=>{
 const valid=await verifyOwnerAccess(access(),config,verifiers);assert.equal(valid.sub,config.owner);assert.equal(valid.email,config.email);assert.ok(valid.exp<=now()+900);
 for(const claims of [{sub:'22222222-2222-4222-8222-222222222222'},{iss:'https://evil.test'},{client_id:'different'},{token_use:'id'},{scope:'openid'},{exp:now()-1},{iat:now()-901},{iat:now()+10}])await assert.rejects(verifyOwnerAccess(access(claims),config,verifiers));
 const token=access();await assert.rejects(verifyOwnerAccess(token.slice(0,-8)+'tampered',config,verifiers));await assert.rejects(verifyOwnerAccess('x'.repeat(3801),config,verifiers));
});
test('code exchange binds both verified tokens to nonce/owner and never returns refresh tokens',async()=>{
 const start=beginLogin(config,'/admin'),flow=consumeFlow(start.cookie,new URL(start.url).searchParams.get('state'),config);let request;
 const result=await exchangeCode('local-code',flow,config,{verifiers,fetcher:async(url,options)=>{request={url,options};return Response.json({access_token:access(),id_token:id(flow.nonce),refresh_token:'must-not-be-stored',token_type:'Bearer'});}});
 assert.equal(new URL(request.url).pathname,'/oauth2/token');assert.equal(request.options.redirect,'error');assert.equal(request.options.body.get('code_verifier'),flow.verifier);assert.equal(request.options.body.get('redirect_uri'),'https://example.test/api/auth/callback');assert.equal(result.returnTo,'/admin');assert.ok(!Object.hasOwn(result,'refresh_token'));
 for(const claims of [{nonce:'wrong'},{email_verified:false},{email:'other@example.test'},{aud:'other-client'},{sub:'22222222-2222-4222-8222-222222222222'}])await assert.rejects(exchangeCode('code',flow,config,{verifiers,fetcher:async()=>Response.json({access_token:access(),id_token:id(flow.nonce,claims),token_type:'Bearer'})}));
 await assert.rejects(exchangeCode('code',flow,config,{verifiers,fetcher:async()=>new Response('x'.repeat(24001))}));
});
test('configuration rejects foreign regions and untrusted login/callback destinations',()=>{
 for(const patch of [{pool:'us-east-1_Wrong'},{domain:'https://evil.test'},{origin:'http://example.test'},{owner:'UNCONFIGURED'}]){
 const e={COGNITO_USER_POOL_ID:patch.pool || config.pool,COGNITO_CLIENT_ID:config.client,COGNITO_LOGIN_DOMAIN:patch.domain || config.domain,SITE_ORIGIN:patch.origin || config.origin,TECHCANVAS_OWNER_SUBJECT:patch.owner || config.owner,ADMIN_EMAIL:config.email,SESSION_SECRET:config.secret};assert.throws(()=>authConfig(e));}
 const logout=new URL(logoutUrl(config));assert.equal(logout.origin,config.domain);assert.equal(logout.searchParams.get('logout_uri'),'https://example.test/');
});
