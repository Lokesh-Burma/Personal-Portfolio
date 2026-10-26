import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const frontRoot=process.cwd(),apiRoot=resolve(process.env.PORTFOLIO_API_ROOT || '../portfolio-api'),studioRoot=resolve(process.env.TECHCANVAS_ROOT || '../techcanvas-ai');
const {chromium}=await import(pathToFileURL(studioRoot+'/infra/node_modules/playwright-core/index.mjs'));
const {renderAssets}=await import(pathToFileURL(studioRoot+'/infra/runtime/service.mjs'));
const {catalog}=await import(pathToFileURL(studioRoot+'/content.mjs'));
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { pbkdf2Sync } from 'node:crypto';
import assert from 'node:assert/strict';

const require=createRequire(apiRoot+'/package.json');
async function freePort(){const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
const frontPort=await freePort(),front='http://localhost:'+frontPort;
Object.assign(process.env,{NODE_ENV:'production',BLOG_STORAGE:'postgres',DATABASE_URL:'postgresql://unused:unused@127.0.0.1:1/unused',ADMIN_EMAIL:'owner@example.test',ADMIN_PASSWORD_HASH:'pbkdf2:210000:test:'+pbkdf2Sync('fixture-password','test',210000,32,'sha256').toString('base64url'),SESSION_SECRET:'integration-only-secret',CORS_ORIGIN:front});
const {Test}=require('@nestjs/testing');const {AppModule}=require(apiRoot+'/dist/app.module');const {BlogsRepository}=require(apiRoot+'/dist/blogs/blogs.repository');const {configureApplication}=require(apiRoot+'/dist/application');
const published={id:'existing',title:'Published integration fixture',slug:'published-fixture',summary:'Public fixture summary',content_markdown:'# Published integration fixture\n\nPublic text.',cover_image:null,tags:['test'],status:'published',published_at:new Date().toISOString(),created_at:new Date().toISOString(),updated_at:new Date().toISOString()};
const posts=[published];let creates=0;
const store={listPublished:async()=>posts.filter(p=>p.status==='published'),listAdmin:async()=>posts,findById:async id=>posts.find(p=>p.id===id)||null,findPublishedBySlug:async slug=>posts.find(p=>p.slug===slug&&p.status==='published')||null,create:async input=>{creates++;const p={...input,id:'imported',created_at:new Date().toISOString(),updated_at:new Date().toISOString()};posts.push(p);return p;},update:async(id,input)=>{const p=posts.find(p=>p.id===id);Object.assign(p,input);return p;},delete:async id=>{const i=posts.findIndex(p=>p.id===id);if(i>=0)posts.splice(i,1);}};
const fixture=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(BlogsRepository).useValue(store).compile();const app=configureApplication(fixture.createNestApplication({bodyParser:false}));await app.listen(0,'127.0.0.1');const api='http://127.0.0.1:'+app.getHttpServer().address().port;
const child=spawn(process.execPath,[frontRoot+'/node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(frontPort)],{cwd:frontRoot,env:{...process.env,PORTFOLIO_API_URL:api,PORTFOLIO_ALLOW_LOCAL_API:'true',SITE_ORIGIN:front},stdio:'ignore'});let browser;
try {
 for(let i=0;i<100;i++){try{if((await fetch(front)).ok)break;}catch{}if(i===99)throw new Error('Frontend did not start');await new Promise(r=>setTimeout(r,200));}
 browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(front);await page.getByRole('heading',{name:/Reliable systems/}).waitFor();assert.equal(await page.evaluate(()=>getComputedStyle(document.body).backgroundColor),'rgb(11, 14, 23)');await page.screenshot({path:frontRoot+'/.aws-build/portfolio-desktop.png'});
 for(const width of [390,320]){await page.setViewportSize({width,height:900});for(const path of ['/','/projects','/blog','/techcanvas','/about','/contact','/experience']){await page.goto(front+path);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Overflow ${width} ${path}`);}}
 await page.setViewportSize({width:390,height:900});await page.goto(front);await page.screenshot({path:frontRoot+'/.aws-build/portfolio-mobile.png',fullPage:true});
 await page.goto(front+'/blog');await page.getByRole('heading',{name:'Published integration fixture'}).waitFor();
 await page.goto(front+'/admin');await page.getByLabel('Email',{exact:true}).fill('owner@example.test');await page.getByLabel('Password',{exact:true}).fill('fixture-password');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('heading',{name:'Blog editor'}).waitFor();
 await page.getByRole('button',{name:/Published integration fixture/}).click();page.on('dialog',d=>d.accept());
 const pack=JSON.parse(renderAssets('Cache Aside',catalog['Cache Aside'])['portfolio.json']);await page.locator('input[type=file]').setInputFiles({name:'portfolio.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(pack))});await page.waitForFunction(()=>document.querySelector('input:not([type=file])')?.value==='Cache Aside');assert.equal(creates,0);assert.equal(await page.getByRole('combobox').inputValue(),'draft');
 await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByText('Saved.',{exact:true}).waitFor();assert.equal(creates,1);assert.equal(posts.find(p=>p.id==='imported').status,'draft');
 await page.goto(front+'/blog');assert.equal(await page.getByRole('heading',{name:'Cache Aside',exact:true}).count(),0);await page.goto(front+'/blog/cache-aside');assert.match(await page.locator('body').textContent(),/404/);
 await page.goto(front+'/admin');await page.getByRole('heading',{name:'Blog editor'}).waitFor();await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log('Full integration passed: responsive dark UI at 1440/390/320, real Next-to-Nest proxy, owner cookie login/logout, actual TechCanvas JSON import/save and public draft isolation. Database was an in-memory fixture.');await context.close();
}finally{if(browser)await browser.close();child.kill('SIGTERM');await app.close();}
