import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
if(!process.argv.includes('--allow-preview-test-writes'))throw new Error('This check creates and deletes a temporary preview draft; explicit test-write flag required.');
const studio=resolve(process.env.TECHCANVAS_ROOT || '../techcanvas-ai');
const {chromium}=await import(pathToFileURL(studio+'/infra/node_modules/playwright-core/index.mjs'));
const {renderAssets}=await import(pathToFileURL(studio+'/infra/runtime/service.mjs'));
const {catalog}=await import(pathToFileURL(studio+'/content.mjs'));
process.loadEnvFile(resolve('.env.local'));
await fs.mkdir('.aws-build',{recursive:true});
const outputs=JSON.parse(await fs.readFile(process.env.PREVIEW_OUTPUTS_FILE || '/tmp/lokesh-platform-preview-outputs.json','utf8')).Outputs;
const front=outputs.find(o=>o.OutputKey==='PortfolioPreviewUrl').OutputValue,api=outputs.find(o=>o.OutputKey==='ApiPreviewUrl').OutputValue;
for(const value of [front,api]){const u=new URL(value);if(u.protocol!=='https:'||!u.hostname.endsWith('.lambda-web.ap-southeast-2.on.aws'))throw new Error('Use native Sydney preview endpoints only.');}
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();let created;
const origin={origin:front};const checks=[];
try {
 assert.equal((await context.request.get(api+'/health')).status(),200);checks.push('API health');
 assert.equal((await context.request.get(front+'/api/admin/blogs')).status(),401);checks.push('anonymous admin blocked');
 await page.goto(front);await page.getByRole('heading',{name:/Reliable systems/}).waitFor();
 await page.screenshot({path:'.aws-build/aws-preview-desktop.png'});
 for(const width of [390,320]){await page.setViewportSize({width,height:900});for(const path of ['/','/projects','/techcanvas','/blog']){await page.goto(front+path);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}}checks.push('live responsive public routes');
 const login=await context.request.post(front+'/api/admin/login',{headers:origin,data:{email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD}});assert.ok([200,201].includes(login.status()),'Owner login failed');
 const cookies=await context.cookies(front),session=cookies.find(c=>c.name==='portfolio_admin_session');assert.ok(session?.secure&&session.httpOnly&&session.sameSite==='Lax');checks.push('owner login and secure host cookie');
 await page.goto(front+'/admin');await page.getByRole('heading',{name:'Blog editor'}).waitFor();
 const pack=JSON.parse(renderAssets('Cache Aside',catalog['Cache Aside'])['portfolio.json']);pack.title='AWS Preview Validation '+Date.now();
 await page.locator('input[type=file]').setInputFiles({name:'portfolio.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(pack))});
 await page.waitForFunction(t=>document.querySelector('input:not([type=file])')?.value===t,pack.title);assert.equal(await page.getByRole('combobox').inputValue(),'draft');
 const responsePromise=page.waitForResponse(r=>r.url()===front+'/api/admin/blogs'&&r.request().method()==='POST');await page.getByRole('button',{name:'Save',exact:true}).click();const saved=await responsePromise;assert.equal(saved.status(),201);created=(await saved.json()).post;assert.equal(created.status,'draft');checks.push('TechCanvas import saved through API into DynamoDB');
 const list=await (await context.request.get(front+'/api/blogs')).json();assert.ok(!list.posts.some(p=>p.id===created.id));assert.equal((await context.request.get(front+'/api/blogs/'+created.slug)).status(),404);assert.equal((await context.request.get(front+'/blog/'+created.slug)).status(),404);checks.push('draft excluded from all public reads');
 const renamed=created.slug+'-renamed';const updated=await context.request.patch(front+'/api/admin/blogs/'+created.id,{headers:origin,data:{slug:renamed}});assert.equal(updated.status(),200);assert.equal((await updated.json()).post.slug,renamed);checks.push('conditional DynamoDB slug rename');
 const removed=await context.request.delete(front+'/api/admin/blogs/'+created.id,{headers:origin});assert.equal(removed.status(),200);created=null;checks.push('temporary draft deleted');
 assert.ok([200,201].includes((await context.request.post(front+'/api/admin/logout',{headers:origin})).status()));const state=await(await context.request.get(front+'/api/admin/session')).json();assert.equal(state.authenticated,false);checks.push('logout clears session');
 await fs.writeFile('.aws-build/aws-preview-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),front,api,checks,productionDataMigrated:false,dnsChanged:false},null,2));console.log(JSON.stringify({front,checks},null,2));
} finally {
 if(created){const response=await context.request.delete(front+'/api/admin/blogs/'+created.id,{headers:origin});console.log('Temporary draft cleanup status:',response.status());}
 await browser.close();
}
