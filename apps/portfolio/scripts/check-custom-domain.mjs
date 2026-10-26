import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {chromium} from 'playwright-core';
import {renderAssets} from '../lib/studio/service.mjs';
import {catalog} from '../lib/studio/content.mjs';
if(!process.argv.includes('--allow-test-writes'))throw new Error('This workflow creates and deletes a temporary draft; explicit test-write flag required.');
process.loadEnvFile(resolve('.env.local'));
await fs.mkdir('.aws-build',{recursive:true});
const front='https://lokeshburma.com';const args=process.env.DOMAIN_DNS_OVERRIDE_IP?['--host-resolver-rules=MAP lokeshburma.com '+process.env.DOMAIN_DNS_OVERRIDE_IP+', MAP www.lokeshburma.com '+process.env.DOMAIN_DNS_OVERRIDE_IP]:[];
const browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();let created;const checks=[];
try {
 const home=await page.goto(front,{waitUntil:'networkidle'});assert.equal(home.status(),200);assert.ok(home.headers()['content-security-policy']?.includes("frame-ancestors 'none'"));assert.equal(home.headers()['x-frame-options'],'DENY');await page.getByRole('heading',{name:/Reliable systems/}).waitFor();checks.push('HTTPS and security headers');
 await page.screenshot({path:'.aws-build/custom-domain-desktop.png'});
 for(const width of [390,320]){await page.setViewportSize({width,height:900});for(const path of ['/','/projects','/techcanvas','/blog','/contact']){await page.goto(front+path);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}}checks.push('responsive public routes');
 await page.goto('https://www.lokeshburma.com/projects?tag=aws');assert.equal(new URL(page.url()).hostname,'lokeshburma.com');assert.equal(new URL(page.url()).searchParams.get('tag'),'aws');checks.push('www canonical path/query redirect');
 await page.goto(front+'/admin');await page.getByLabel('Email',{exact:true}).fill(process.env.ADMIN_EMAIL);await page.getByLabel('Password',{exact:true}).fill(process.env.ADMIN_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('heading',{name:'Blog editor'}).waitFor();
 const session=(await context.cookies(front)).find(c=>c.name==='portfolio_admin_session');assert.ok(session?.secure&&session.httpOnly&&session.sameSite==='Lax');assert.equal(session.domain,'lokeshburma.com');checks.push('owner UI login and host-only secure session');
 const pack=JSON.parse(renderAssets('Cache Aside',catalog['Cache Aside'])['portfolio.json']);pack.title='Domain Validation '+Date.now();await page.locator('input[type=file]').setInputFiles({name:'portfolio.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(pack))});await page.waitForFunction(t=>document.querySelector('input:not([type=file])')?.value===t,pack.title);
 const save=page.waitForResponse(r=>r.url()===front+'/api/admin/blogs'&&r.request().method()==='POST');await page.getByRole('button',{name:'Save',exact:true}).click();const response=await save;assert.equal(response.status(),201);created=(await response.json()).post;assert.equal(created.status,'draft');checks.push('TechCanvas draft save through CloudFront and API');
 const publicRead=await page.evaluate(async slug=>{const r=await fetch('/api/blogs/'+slug);return r.status;},created.slug);assert.equal(publicRead,404);checks.push('draft remains private');
 const deleted=await page.evaluate(async id=>(await fetch('/api/admin/blogs/'+id,{method:'DELETE'})).status,created.id);assert.equal(deleted,200);created=null;
 const cleared=await page.evaluate(async()=>{await fetch('/api/admin/logout',{method:'POST'});return (await(await fetch('/api/admin/session')).json()).authenticated;});assert.equal(cleared,false);checks.push('test draft removed and logout verified');
 await fs.writeFile('.aws-build/custom-domain-verification.json',JSON.stringify({checkedAt:new Date().toISOString(),domain:front,localDnsOverride:Boolean(args.length),checks,sampleBlogsMigrated:false},null,2));console.log(JSON.stringify({checks,localDnsOverride:Boolean(args.length)},null,2));
}finally{if(created)console.log('Test record cleanup status',await page.evaluate(async id=>(await fetch('/api/admin/blogs/'+id,{method:'DELETE'})).status,created.id));await browser.close();}
