import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createCloudSession, validateCloudConfig } from '../../public/cloud-session.mjs';
const config={apiUrl:'https://example.execute-api.ap-southeast-2.amazonaws.com',loginDomain:'https://test.auth.ap-southeast-2.amazoncognito.com',clientId:'client123',frontendUrl:'https://example.cloudfront.net'};
function browser(search='') {
  const stored=new Map(),requests=[],navigations=[];let cleaned=false;
  return {stored,requests,navigations,get cleaned(){return cleaned;},env:{cryptoApi:webcrypto,now:()=>1000000,location:{origin:config.frontendUrl,pathname:'/',search,assign:url=>navigations.push(url)},history:{replaceState:()=>{cleaned=true;}},storage:{setItem:(k,v)=>stored.set(k,v),getItem:k=>stored.get(k),removeItem:k=>stored.delete(k)},fetcher:async(url,options)=>{requests.push({url:String(url),options});return {ok:true,status:200,json:async()=>({access_token:'secret-access',refresh_token:'secret-refresh',token_type:'Bearer',expires_in:3600})};}}};
}
test('PKCE uses S256 and persists only verifier and state before redirect',async()=>{
  const b=browser(),s=await createCloudSession(config,b.env);assert.equal(s.signedIn,false);await s.login();
  const url=new URL(b.navigations[0]),saved=JSON.parse(b.stored.get('techcanvas.pkce'));
  assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('state'),saved.state);
  assert.equal(url.searchParams.get('response_type'),'code');assert.equal(saved.verifier.length,43);
  assert.equal(b.requests.length,0);assert.ok(!JSON.stringify([...b.stored]).includes('access_token'));
});
test('callback consumes state, removes code from URL and keeps tokens out of storage',async()=>{
  const b=browser('?code=code123&state=state123');b.stored.set('techcanvas.pkce',JSON.stringify({state:'state123',verifier:'v'.repeat(43),created:999999}));
  const s=await createCloudSession(config,b.env);assert.ok(s.signedIn);assert.ok(b.cleaned);assert.equal(b.stored.size,0);
  assert.equal(b.requests[0].options.body.get('code_verifier'),'v'.repeat(43));
  await s.fetch('/api/jobs');assert.equal(b.requests[1].options.headers.get('Authorization'),'Bearer secret-access');
  await assert.rejects(s.fetch('/api/../../elsewhere'),/Invalid/);
  await s.logout();assert.equal(s.signedIn,false);assert.equal(b.requests[2].options.body.get('token'),'secret-refresh');
  assert.match(b.navigations[0],/\/logout\?/);
});
test('mismatched or stale callback state never exchanges a code',async()=>{
  for(const saved of [{state:'wrong',verifier:'v',created:999999},{state:'ok',verifier:'v',created:1}]) {
    const b=browser('?code=code&state=ok');b.stored.set('techcanvas.pkce',JSON.stringify(saved));
    await assert.rejects(createCloudSession(config,b.env),/expired|verified/);assert.equal(b.requests.length,0);assert.ok(b.cleaned);assert.equal(b.stored.size,0);
  }
});
test('configuration rejects remote token destinations and mismatched callback origins',()=>{
  for(const patch of [{apiUrl:'https://attacker.example'},{loginDomain:'https://attacker.example'},{frontendUrl:'https://other.cloudfront.net'},{apiUrl:'https://example.execute-api.ap-southeast-2.amazonaws.com/?a=1'}]) assert.throws(()=>validateCloudConfig({...config,...patch},config.frontendUrl));
});
