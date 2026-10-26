import test from 'node:test';
import assert from 'node:assert/strict';
import {forwardPortfolioApi,portfolioApiBase} from '../lib/portfolio-api.ts';
const baseUrl='https://content.example.test';
test('proxy forwards only API session cookie and preserves host-only security flags',async()=>{
 let seen;const response=await forwardPortfolioApi(new Request('https://lokeshburma.com/api/admin/blogs',{headers:{cookie:'other=secret; portfolio_admin_session=token.signature'}}),'/admin/blogs',{baseUrl,fetcher:async(url,options)=>{seen={url,options};return new Response('{"posts":[]}',{headers:{'set-cookie':'portfolio_admin_session=new.signature; Domain=content.example.test; Path=/auth; Max-Age=3600'}});}});
 assert.equal(seen.options.headers.get('cookie'),'portfolio_admin_session=token.signature');assert.equal(seen.options.redirect,'error');const cookie=response.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Lax/);assert.ok(!cookie.includes('Domain='));assert.equal(response.headers.get('cache-control'),'no-store');
});
test('cross-site writes and oversized payloads never reach upstream',async()=>{
 const fetcher=async()=>{throw new Error('must not call');};
 assert.equal((await forwardPortfolioApi(new Request('https://lokeshburma.com/api/admin/blogs',{method:'POST',headers:{origin:'https://evil.test'},body:'{}'}),'/admin/blogs',{baseUrl,fetcher})).status,403);
 assert.equal((await forwardPortfolioApi(new Request('https://lokeshburma.com/api/admin/blogs',{method:'POST',body:'x'.repeat(256001)}),'/admin/blogs',{baseUrl,fetcher})).status,413);
});
test('invalid upstream configuration and redirects fail closed; absent config keeps existing backend',async()=>{
 assert.throws(()=>portfolioApiBase('http://external.example.test'));assert.throws(()=>portfolioApiBase('https://user:pass@external.example.test'));
 const response=await forwardPortfolioApi(new Request('https://lokeshburma.com/api/blogs'),'/blogs',{baseUrl,fetcher:async()=>{throw new Error('redirect');}});assert.equal(response.status,503);assert.ok(!(await response.text()).includes('redirect'));
 assert.equal(await forwardPortfolioApi(new Request('https://lokeshburma.com/api/blogs'),'/blogs',{baseUrl:''}),null);
});
test('expired backend sessions retain frontend session contract',async()=>{
 const response=await forwardPortfolioApi(new Request('https://lokeshburma.com/api/admin/session'),'/auth/session',{baseUrl,fetcher:async()=>new Response('{"message":"Unauthorized"}',{status:401})});assert.equal(response.status,200);assert.deepEqual(await response.json(),{authenticated:false,email:null});
});
