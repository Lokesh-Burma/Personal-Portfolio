import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createAdminSession} from '../apps/portfolio/lib/session.ts';
const root=fileURLToPath(new URL('../',import.meta.url)),listener=createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));const base='http://127.0.0.1:'+port;
const secret='local-boundary-secret-more-than-32-characters',email='owner@example.test';
process.env.ADMIN_SESSION_SECRET=secret;process.env.ADMIN_EMAIL=email;
const legacy=createAdminSession(email);
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{cwd:join(root,'apps/portfolio'),env:{...process.env,NODE_ENV:'production',PLATFORM_LOCAL_DEMO:'false',ADMIN_EMAIL:email,ADMIN_SESSION_SECRET:secret,SITE_ORIGIN:'https://example.test',COGNITO_USER_POOL_ID:'ap-southeast-2_LocalPool',COGNITO_CLIENT_ID:'localclient123',COGNITO_LOGIN_DOMAIN:'https://local-test.auth.ap-southeast-2.amazoncognito.com',TECHCANVAS_OWNER_SUBJECT:'11111111-1111-4111-8111-111111111111'},stdio:['ignore','pipe','pipe']});
let logs='';child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
async function get(path,headers={}){return fetch(base+path,{headers,redirect:'manual'});}
try{
 let ready=false;for(let n=0;n<120;n++){if(child.exitCode!==null)throw Error(logs);try{if((await get('/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}assert.ok(ready,logs);
 const session=await (await get('/api/admin/session')).json();assert.equal(session.authMode,'cognito');assert.equal(session.loginReady,true);assert.equal(session.authenticated,false);
 for(const path of ['/api/admin/blogs','/api/techcanvas/jobs'])assert.equal((await get(path,{cookie:'portfolio_admin_session='+legacy})).status,401);
 const password=await fetch(base+'/api/admin/login',{method:'POST',headers:{origin:'https://example.test','content-type':'application/json'},body:JSON.stringify({email,password:'anything'})});assert.equal(password.status,403);
 const start=await get('/api/auth/login?returnTo=https://evil.test');assert.equal(start.status,303);const authorize=new URL(start.headers.get('location'));assert.equal(authorize.origin,'https://local-test.auth.ap-southeast-2.amazoncognito.com');assert.equal(authorize.searchParams.get('redirect_uri'),'https://example.test/api/auth/callback');assert.equal(authorize.searchParams.get('code_challenge_method'),'S256');
 const cookie=start.headers.get('set-cookie');assert.match(cookie,/^__Host-platform_login=/);assert.match(cookie,/HttpOnly/i);assert.match(cookie,/Secure/i);assert.match(cookie,/SameSite=lax/i);assert.match(cookie,/Path=\//);assert.ok(!/Domain=/i.test(cookie));
 const callback=await get('/api/auth/callback?code=never-exchanged&state=wrong',{cookie:cookie.split(';')[0]});assert.equal(callback.status,303);assert.equal(callback.headers.get('location'),'/login?error=sign-in-failed');assert.equal(callback.headers.getSetCookie().length,0,'Forged callbacks must not cancel an existing session or valid pending flow');
 const denied=await get('/api/auth/callback?error=access_denied&state='+encodeURIComponent(authorize.searchParams.get('state')),{cookie:cookie.split(';')[0]});assert.equal(denied.status,303);assert.ok(denied.headers.getSetCookie().some(c=>c.startsWith('__Host-platform_login=') && /Max-Age=0/.test(c)));assert.ok(!denied.headers.getSetCookie().some(c=>c.startsWith('__Host-platform_owner=')));
 const logout=await fetch(base+'/api/admin/logout',{method:'POST',headers:{origin:'https://example.test'}});assert.equal(logout.status,200);const result=await logout.json();assert.equal(new URL(result.redirectUrl).pathname,'/logout');assert.equal(new URL(result.redirectUrl).searchParams.get('logout_uri'),'https://example.test/');assert.equal(logout.headers.getSetCookie().filter(c=>/Max-Age=0/.test(c)).length,3);
 const blocked=await fetch(base+'/api/admin/logout',{method:'POST',headers:{origin:'https://evil.test'}});assert.equal(blocked.status,403);
 const loginPage=await (await get('/login')).text();assert.match(loginPage,/Sign in with MFA/);assert.ok(!loginPage.includes('type="password"'));
 console.log('Production MFA boundary passed: shared Cognito entrypoint, secure flow cookie, password-only/legacy-cookie rejection for both APIs, invalid callback cleanup and common Cognito logout. No Cognito or other AWS calls.');
}finally{child.kill('SIGTERM');await new Promise(r=>{if(child.exitCode!==null)r();else{child.once('exit',r);setTimeout(()=>{child.kill('SIGKILL');r();},5000).unref();}});}
