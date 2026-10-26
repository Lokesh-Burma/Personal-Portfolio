import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:net';
import {hashAdminPassword} from '../apps/portfolio/lib/session.ts';
const root=fileURLToPath(new URL('../',import.meta.url)),directory=await mkdtemp(join(tmpdir(),'unified-platform-'));
const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));const base='http://127.0.0.1:'+port;
const password='local-integration-only-password',email='owner@example.test';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{cwd:join(root,'apps/portfolio'),env:{...process.env,NODE_ENV:'production',SITE_ORIGIN:base,ADMIN_EMAIL:email,ADMIN_PASSWORD_HASH:hashAdminPassword(password),ADMIN_SESSION_SECRET:'local-integration-secret-more-than-32-characters',PLATFORM_LOCAL_DEMO:'true',PLATFORM_DATA_DIR:directory,AWS_EXECUTION_ENV:'',AWS_LAMBDA_HTTP_ENDPOINT:'',PORTFOLIO_API_URL:'https://must-not-be-called.invalid'},stdio:['ignore','pipe','pipe']});
let logs='';child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
let cookie='';async function request(path,method='GET',body,extra={}){const response=await fetch(base+path,{method,headers:{...(cookie?{cookie}:{}),...(body===undefined?{}:{'content-type':'application/json'}),...extra},body:body===undefined?undefined:typeof body==='string'?body:JSON.stringify(body),redirect:'manual'});const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}return {response,status:response.status,data};}
try{
 let ready=false;for(let i=0;i<120;i++){if(child.exitCode!==null)throw Error(logs);try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}assert.ok(ready,logs);
 assert.equal((await request('/api/admin/blogs')).status,401);assert.equal((await request('/api/techcanvas/jobs')).status,401);
 assert.equal((await request('/api/admin/login','POST',{email,password},{origin:'https://evil.test'})).status,403);
 assert.equal((await request('/api/admin/login','POST',{email,password:'wrong'})).status,401);
 const login=await request('/api/admin/login','POST',{email,password},{origin:base});assert.equal(login.status,200);const raw=login.response.headers.get('set-cookie');assert.match(raw,/HttpOnly/i);assert.match(raw,/Secure/i);assert.match(raw,/SameSite=lax/i);assert.ok(!/Domain=/i.test(raw));cookie=raw.split(';')[0];
 assert.equal((await request('/api/admin/session')).data.authenticated,true);
 assert.equal((await request('/techcanvas/studio')).status,200);
 assert.equal((await request('/api/admin/blogs','POST',{}, {origin:'https://evil.test'})).status,403);
 assert.equal((await request('/api/admin/blogs','POST','x'.repeat(256001))).status,413);
 assert.equal((await request('/api/admin/blogs','POST',{title:'Bad',content_markdown:'x',id:'overwrite'})).status,400);
 const config=await request('/api/techcanvas/config');assert.equal(config.data.mode,'demo');assert.equal(config.data.imageGeneration,false);
 const input={topic:'Cache Aside'},headers={'idempotency-key':'integration-cache-aside'};
 const created=await request('/api/techcanvas/jobs','POST',input,headers);assert.equal(created.status,202);const id=created.data.id;
 assert.equal((await request('/api/techcanvas/jobs','POST',input,headers)).data.id,id);
 assert.equal((await request('/api/techcanvas/jobs','POST',{topic:'Idempotency'},headers)).status,409);
 const job=await request('/api/techcanvas/jobs/'+id);assert.equal(job.data.status,'completed');assert.equal(Object.keys(job.data.assets).length,8);
 const svg=await request(job.data.assets['memory.svg']);assert.equal(svg.status,200);assert.match(svg.data,/<svg/);assert.match(svg.response.headers.get('cache-control'),/no-store/);
 assert.equal((await request('/api/techcanvas/jobs/'+id+'/assets/not-a-file')).status,404);
 const draft=await request('/api/techcanvas/jobs/'+id+'/draft','POST',{});assert.equal(draft.status,201,JSON.stringify(draft.data));assert.equal(draft.data.post.status,'draft');assert.equal(draft.data.post.cover_image,null);const postId=draft.data.post.id,slug=draft.data.post.slug;
 assert.equal((await request('/api/techcanvas/jobs/'+id+'/draft','POST',{})).status,409);
 assert.equal((await request('/api/blogs/'+slug)).status,404);assert.equal((await request('/api/blogs')).data.posts.length,0);
 assert.equal((await request('/api/admin/blogs/'+postId,'PATCH',{status:'published'})).status,200);assert.equal((await request('/api/blogs/'+slug)).status,200);
 assert.equal((await request('/api/admin/blogs/'+postId,'PATCH',{status:'draft'})).status,200);assert.equal((await request('/api/blogs/'+slug)).status,404);
 assert.equal((await request('/api/admin/logout','POST',undefined,{origin:'https://evil.test'})).status,403);
 assert.equal((await request('/api/admin/logout','POST')).status,200);cookie='';assert.equal((await request(job.data.assets['memory.svg'])).status,401);assert.equal((await request('/api/admin/blogs')).status,401);
 if(process.argv.includes('--browser')){
  await mkdir(join(root,'.artifacts'),{recursive:true});
  const {chromium}=createRequire(new URL('../apps/portfolio/package.json',import.meta.url))('playwright-core');
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  try {const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/admin');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('heading',{name:'Blog editor',exact:true}).waitFor();
   await page.goto(base+'/techcanvas/studio');await page.getByRole('button',{name:'Create demo pack',exact:true}).waitFor();await page.getByLabel('Concept',{exact:true}).selectOption('Idempotency');await page.getByRole('button',{name:'Create demo pack',exact:true}).click();await page.getByRole('heading',{name:'Idempotency',exact:true}).waitFor();
   const image=page.getByAltText('Idempotency memory diagram');await image.waitFor();await page.waitForFunction(()=>{const i=document.querySelector('img[alt="Idempotency memory diagram"]');return i && i.complete && i.naturalWidth>0;});
   await page.getByRole('button',{name:'Save blog draft',exact:true}).click();await page.getByRole('status').filter({hasText:'Saved as an unpublished draft'}).waitFor();
   await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:join(root,'.artifacts/unified-studio-desktop.png'),fullPage:true});
   await page.setViewportSize({width:390,height:844});await page.screenshot({path:join(root,'.artifacts/unified-studio-mobile.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
   // Exercise activated UI with intercepted responses only; no cloud or model calls.
   const attempts=[],mockJob={id:'0000000000-22222222-2222-4222-8222-222222222222',topic:'Cache Aside',status:'completed',provider:'bedrock',revision:0,imageStatus:'completed',content:{paragraph:'Mock cloud explanation',example:'Mock example',tradeoff:'Mock tradeoff'},assets:{'illustration.png':base+'/images/blog/portfolio-techcanvas-architecture-92f1827d326b.png'}};
   await page.route('**/api/techcanvas/**',async route=>{
    const url=new URL(route.request().url()),path=url.pathname;
    const reply=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(path.endsWith('/config'))return reply({mode:'cloud',ready:true,imageGeneration:true,topics:['Cache Aside'],notice:'Mock cloud trial: no model calls.'});
    if(path.endsWith('/jobs') && route.request().method()==='POST'){
     attempts.push({key:route.request().headers()['idempotency-key'],body:route.request().postDataJSON()});
     return attempts.length===1?reply({error:'Simulated lost response. Retry the same request.'},503):reply(mockJob,202);
    }
    if(path.endsWith('/jobs'))return reply({jobs:attempts.length>=2?[mockJob]:[],nextCursor:null});
    if(path.endsWith('/'+mockJob.id))return reply(mockJob);
    return route.abort();
   });
   await page.goto(base+'/techcanvas/studio');await page.getByRole('button',{name:'Create content pack',exact:true}).waitFor();
   await page.getByLabel('Include one AI illustration',{exact:false}).check();await page.getByRole('button',{name:'Create content pack',exact:true}).click();
   await page.getByRole('status').filter({hasText:'Simulated lost response'}).waitFor();await page.getByRole('button',{name:'Create content pack',exact:true}).click();
   const illustration=page.getByAltText('Cache Aside AI illustration');await illustration.waitFor();await illustration.evaluate(i=>i.decode());assert.equal(attempts.length,2);assert.equal(attempts[0].key,attempts[1].key);assert.deepEqual(attempts[0].body,{topic:'Cache Aside',generateImage:true});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
   await page.screenshot({path:join(root,'.artifacts/studio-image-trial-mock-mobile.png'),fullPage:true});
   await context.close();console.log('Browser checks passed: shared login, SVG/draft workflow, desktop/mobile, mocked cloud image preview and stable retry request keys. No model calls.');
  }finally{await browser.close();}
 }
 console.log('Unified app integration passed: one Next.js process; owner login, CSRF/body limits, studio generation, idempotency, eight private assets, direct draft save, publish/withdraw and logout. No NestJS, standalone studio server or AWS calls.');
}finally{child.kill('SIGTERM');await new Promise(resolve=>{if(child.exitCode!==null)resolve();else{child.once('exit',resolve);setTimeout(()=>{child.kill('SIGKILL');resolve();},5000).unref();}});await rm(directory,{recursive:true,force:true});}
