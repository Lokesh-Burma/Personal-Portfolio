import test from 'node:test';import assert from 'node:assert/strict';
import {createAdminSession,readAdminSession,hashAdminPassword,verifyAdminPassword} from '../lib/session.ts';
import {checkRequest,readJson} from '../lib/http.ts';
import {DynamoBlogsRepository} from '../lib/blogs/dynamo-repository.ts';
import {validateBlogInput} from '../lib/blog-db.ts';
test('owner sessions retain compatible signatures and reject malformed, foreign and expired tokens',async()=>{
 process.env.ADMIN_SESSION_SECRET='local-test-session-secret-with-more-than-32-characters';process.env.ADMIN_EMAIL='owner@example.test';process.env.ADMIN_PASSWORD_HASH=hashAdminPassword('local-test-password');
 assert.equal(await verifyAdminPassword('local-test-password'),true);assert.equal(await verifyAdminPassword('wrong'),false);
 const token=createAdminSession(process.env.ADMIN_EMAIL);assert.equal(readAdminSession(token).email,process.env.ADMIN_EMAIL);assert.equal(readAdminSession(token+'.extra'),null);assert.equal(readAdminSession(token.slice(0,-2)+'xx'),null);assert.equal(readAdminSession(createAdminSession('another@example.test')),null);
 const previous=Date.now;Date.now=()=>previous()+28801000;try{assert.equal(readAdminSession(token),null);}finally{Date.now=previous;}
});
test('native writes reject cross-site requests, large bodies and malformed JSON',async()=>{
 assert.throws(()=>checkRequest(new Request('https://example.test/api/admin/blogs',{method:'POST',headers:{origin:'https://evil.test'}})),{status:403});
 assert.throws(()=>checkRequest(new Request('https://example.test/api/admin/logout',{method:'POST',headers:{'sec-fetch-site':'cross-site'}})),{status:403});
 await assert.rejects(readJson(new Request('https://example.test',{method:'POST',headers:{'content-type':'application/json'},body:'x'.repeat(4097)}),4096),{status:413});
 await assert.rejects(readJson(new Request('https://example.test',{method:'POST',headers:{'content-type':'application/json'},body:'{'})),{status:400});
});
test('blog validation refuses unexpected fields, invalid types and unsafe covers',()=>{
 const post={title:'Title',content_markdown:'# Draft'};assert.equal(validateBlogInput(post).status,'draft');
 for(const bad of [{...post,title:42},{...post,cover_image:'javascript:alert(1)'},{...post,tags:['x'.repeat(41)]},{...post,id:'overwrite'},{...post,status:'other'}])assert.throws(()=>validateBlogInput(bad));
 assert.equal(validateBlogInput({...post,status:'draft',published_at:'2026-01-01'}).published_at,null);
});
const blog={id:'test-id',title:'Cache Aside',slug:'cache-aside',summary:'Summary',content_markdown:'# Cache Aside',cover_image:null,tags:['techcanvas'],status:'draft',published_at:null,created_at:'2026-10-25T00:00:00.000Z',updated_at:'2026-10-25T00:00:00.000Z'};
test('native DynamoDB repository creates slug and index atomically and detects conflicts',async()=>{
 const calls=[];const r=new DynamoBlogsRepository('Table',{send:async c=>{calls.push(c);return {};}});assert.equal((await r.importPost(blog)).created,true);const tx=calls[1].input.TransactItems;assert.equal(tx.length,3);assert.ok(tx.every(x=>x.Put.ConditionExpression==='attribute_not_exists(pk)'));assert.equal(tx[1].Put.Item.pk,'SLUG#cache-aside');
 const conflict=new DynamoBlogsRepository('Table',{send:async c=>{if(c.constructor.name==='GetCommand')return {};throw {name:'TransactionCanceledException',CancellationReasons:[{Code:'ConditionalCheckFailed'}]};}});await assert.rejects(conflict.importPost(blog),{status:409});
});
test('native public lookup rechecks current visibility and slug, and rename is conditional',async()=>{
 let tx;const repo=new DynamoBlogsRepository('Table',{send:async c=>{if(c.constructor.name==='GetCommand')return c.input.Key.sk==='LOOKUP'?{Item:{id:'test-id'}}:{Item:{...blog,pk:'POST#test-id',sk:'META',version:2}};tx=c.input.TransactItems;return {};}});
 assert.equal(await repo.findPublishedBySlug('cache-aside'),null);await repo.update(blog.id,{...blog,slug:'new-slug'});assert.equal(tx.length,3);assert.equal(tx[0].Put.ExpressionAttributeValues[':v'],2);assert.equal(tx[0].Put.Item.version,3);assert.equal(tx[1].Delete.Key.pk,'SLUG#cache-aside');
});

test('local demo checks the incoming host behind a container bind address',()=>{
 const previous=process.env.PLATFORM_LOCAL_DEMO;process.env.PLATFORM_LOCAL_DEMO='true';
 try{assert.doesNotThrow(()=>checkRequest(new Request('http://0.0.0.0:3000/api/admin/session',{headers:{host:'127.0.0.1:14331'}})));assert.throws(()=>checkRequest(new Request('http://127.0.0.1:3000/api/admin/session',{headers:{host:'external.example.test'}})),{status:403});}finally{if(previous===undefined)delete process.env.PLATFORM_LOCAL_DEMO;else process.env.PLATFORM_LOCAL_DEMO=previous;}
});
