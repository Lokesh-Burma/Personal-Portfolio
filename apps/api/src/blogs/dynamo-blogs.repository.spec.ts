import { DynamoBlogsRepository } from './dynamo-blogs.repository';
import { ConflictException } from '@nestjs/common';
const blog={id:'test-id',title:'Cache Aside',slug:'cache-aside',summary:'Summary',content_markdown:'# Cache Aside',cover_image:null,tags:['techcanvas'],status:'draft' as const,published_at:null,created_at:'2026-10-25T00:00:00.000Z',updated_at:'2026-10-25T00:00:00.000Z'};
describe('DynamoDB blog repository',()=>{
 it('creates the post, unique slug and index entry atomically',async()=>{
  const calls:any[]=[];const repo=new DynamoBlogsRepository('Table',{send:async c=>{calls.push(c);return {};}});
  const result=await repo.importPost(blog);expect(result.created).toBe(true);expect(result.post).toEqual(blog);
  const tx=calls[1].input.TransactItems;expect(tx).toHaveLength(3);expect(tx.every((v:any)=>v.Put.ConditionExpression==='attribute_not_exists(pk)')).toBe(true);expect(tx[1].Put.Item.pk).toBe('SLUG#cache-aside');
 });
 it('does not overwrite different content during migration and replays matching imports',async()=>{
  let writes=0;const repo=new DynamoBlogsRepository('Table',{send:async c=>{if(c.constructor.name==='GetCommand')return {Item:{...blog,pk:'POST#test-id',sk:'META',version:1}};writes++;return {};}});
  expect((await repo.importPost(blog)).created).toBe(false);
  await expect(repo.importPost({...blog,title:'Changed'})).rejects.toBeInstanceOf(ConflictException);expect(writes).toBe(0);
 });
 it('rechecks current visibility and slug before returning a public post',async()=>{
  const repo=new DynamoBlogsRepository('Table',{send:async c=>c.input.Key.sk==='LOOKUP'?{Item:{id:'test-id'}}:{Item:{...blog,pk:'POST#test-id',sk:'META',version:1}}});
  expect(await repo.findPublishedBySlug('cache-aside')).toBeNull();
 });
 it('renames slug and updates the version in one conditional transaction',async()=>{
  let tx:any;const repo=new DynamoBlogsRepository('Table',{send:async c=>{if(c.constructor.name==='GetCommand')return {Item:{...blog,pk:'POST#test-id',sk:'META',version:2}};tx=c.input.TransactItems;return {};}});
  await repo.update(blog.id,{title:blog.title,summary:blog.summary,content_markdown:blog.content_markdown,cover_image:null,tags:[],status:'draft',published_at:null,slug:'new-slug'});
  expect(tx).toHaveLength(3);expect(tx[0].Put.ExpressionAttributeValues[':v']).toBe(2);expect(tx[0].Put.Item.version).toBe(3);expect(tx[1].Delete.Key.pk).toBe('SLUG#cache-aside');expect(tx[2].Put.Item.pk).toBe('SLUG#new-slug');
 });
 it('reports conditional conflicts and rejects oversized records',async()=>{
  const repo=new DynamoBlogsRepository('Table',{send:async c=>{if(c.constructor.name==='GetCommand')return {};throw {name:'TransactionCanceledException',CancellationReasons:[{Code:'ConditionalCheckFailed'}]};}});
  await expect(repo.importPost(blog)).rejects.toBeInstanceOf(ConflictException);
  await expect(repo.importPost({...blog,content_markdown:'漢'.repeat(120000)})).rejects.toThrow('storage size');
 });
});
