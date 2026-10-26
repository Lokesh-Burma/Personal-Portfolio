import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../server.mjs';
import { catalog } from '../../content.mjs';
import { renderAssets } from '../runtime/service.mjs';
const directory=await mkdtemp(join(tmpdir(),'techcanvas-browser-'));
const app=await createApp({directory,provider:'demo'});
await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try {
  const errors=[];const context=await browser.newContext({acceptDownloads:true});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${app.server.address().port}`);
  await page.waitForFunction(()=>document.querySelector('#mode').textContent==='LOCAL / CURATED DEMO');
  await page.click('#generate');await page.waitForFunction(()=>document.querySelector('#status').textContent==='completed');
  await page.locator('#memory').waitFor({state:'visible'});
  const downloaded=page.waitForEvent('download');await page.click('#memory-png');assert.match((await downloaded).suggestedFilename(),/memory.png/);
  assert.deepEqual(errors,[]);await context.close();
  console.log('Browser local mode passed: create pack, render diagrams and export PNG.');
  const cloud=await browser.newContext({acceptDownloads:true}),cp=await cloud.newPage();cp.on('pageerror',e=>errors.push(e.message));
  const frontend='https://studio.test',api='https://example.execute-api.ap-southeast-2.amazonaws.com',login='https://test.auth.ap-southeast-2.amazoncognito.com';
  const id='00abcdef01-12345678-1234-4123-8123-123456789abc',content=catalog['Cache Aside'],files=renderAssets('Cache Aside',content);
  const assetHost='https://assets.s3.ap-southeast-2.amazonaws.com';
  let requests=0,unauthorizedAsset=false;
  await cloud.addInitScript(()=>sessionStorage.setItem('techcanvas.pkce',JSON.stringify({state:'expected',verifier:'v'.repeat(43),created:Date.now()})));
  await cloud.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.origin===frontend) {
      if(url.pathname==='/cloud-config.json') return route.fulfill({json:{cloud:true,frontendUrl:frontend,apiUrl:api,loginDomain:login,clientId:'client123'}});
      const file={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/cloud-session.mjs':'cloud-session.mjs'}[url.pathname];
      if(file) return route.fulfill({body:await readFile(new URL('../../public/'+file,import.meta.url)),contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'text/javascript'});
    }
    if(url.origin===login && url.pathname==='/oauth2/token') {
      assert.match(req.postData(),/code_verifier=/);
      return route.fulfill({json:{access_token:'test-access',refresh_token:'test-refresh',token_type:'Bearer',expires_in:3600}});
    }
    if(url.origin===api) {
      assert.equal(req.headers().authorization,'Bearer test-access');requests++;
      if(url.pathname==='/api/config') return route.fulfill({json:{cloud:true,provider:'bedrock',ready:false,topics:[],s3Enabled:false,limits:{dailyUsed:0,daily:20,monthlyUsed:0,monthly:300}}});
      if(url.pathname==='/api/jobs') return route.fulfill({json:{jobs:[{id,topic:'Cache Aside',status:'completed',created:new Date().toISOString()}]}});
      if(url.pathname==='/api/jobs/'+id) return route.fulfill({json:{id,topic:'Cache Aside',provider:'bedrock',status:'completed',revision:0,content,assets:Object.fromEntries(Object.keys(files).map(name=>[name,assetHost+'/'+name+'?signature=test']))}});
    }
    if(url.origin===assetHost) {
      if(req.headers().authorization) unauthorizedAsset=true;
      const name=url.pathname.slice(1);return route.fulfill({body:files[name],contentType:name.endsWith('.svg')?'image/svg+xml':'text/plain',headers:{'access-control-allow-origin':frontend}});
    }
    throw new Error('Unexpected network request '+url.origin+url.pathname);
  });
  await cp.goto(frontend+'/?code=test-code&state=expected');
  await cp.waitForFunction(()=>document.querySelector('#hint').textContent.includes('awaiting activation'));
  assert.ok(await cp.locator('#generate').isDisabled());assert.ok(await cp.locator('#signout').isVisible());
  await cp.locator('#library .job').click();await cp.locator('#memory').waitFor({state:'visible'});
  const png=cp.waitForEvent('download');await cp.click('#png');assert.match((await png).suggestedFilename(),/summary.png/);
  assert.equal(unauthorizedAsset,false);assert.ok(requests>=3);assert.deepEqual(errors,[]);
  assert.deepEqual(await cp.evaluate(()=>({local:localStorage.length,session:sessionStorage.length})),{local:0,session:0});
  await cloud.close();console.log('Browser cloud mode passed: PKCE callback, bearer API calls, disabled creation, private visuals and PNG export; no tokens stored.');
} finally {await browser.close();await app.close();await rm(directory,{recursive:true,force:true});}
