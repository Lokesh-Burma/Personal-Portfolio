import { BadRequestException, ConflictException } from './errors.ts';
import { randomUUID } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import type { Blog, BlogWrite } from './types.ts';

type Stored = Blog & { pk: string; sk: string; version: number };
type Sender = { send(command: any): Promise<any> };
const publicBlog = (record: Stored): Blog => ({id:record.id,title:record.title,slug:record.slug,summary:record.summary,content_markdown:record.content_markdown,cover_image:record.cover_image,tags:record.tags,status:record.status,published_at:record.published_at,created_at:record.created_at,updated_at:record.updated_at});
export class DynamoBlogsRepository {
  private readonly client: Sender;
  private readonly table: string;
  constructor(table: string, client?: Sender) {
    this.table=table;
    if(!table)throw new Error('BLOG_TABLE_NAME is required');
    this.client=client || DynamoDBDocumentClient.from(new DynamoDBClient({region:'ap-southeast-2',maxAttempts:1,requestHandler:{connectionTimeout:3000,requestTimeout:10000}}),{marshallOptions:{removeUndefinedValues:true}});
  }
  private key(id: string) {return {pk:'POST#'+id,sk:'META'};}
  private async load(id: string): Promise<Stored|null> {
    return (await this.client.send(new GetCommand({TableName:this.table,Key:this.key(id),ConsistentRead:true}))).Item || null;
  }
  async findById(id: string) {const item=await this.load(id);return item?publicBlog(item):null;}
  private async list(): Promise<Blog[]> {
    const rows: Blog[]=[];let cursor;
    do {
      const page=await this.client.send(new QueryCommand({TableName:this.table,KeyConditionExpression:'pk = :pk',ExpressionAttributeValues:{':pk':'INDEX#BLOGS'},ConsistentRead:true,ExclusiveStartKey:cursor,Limit:100,ScanIndexForward:false}));
      // Read current records consistently: index entries never expose withdrawn drafts.
      for(const entry of page.Items || []) {const post=await this.findById(entry.id);if(post)rows.push(post);}
      cursor=page.LastEvaluatedKey;
    }while(cursor);
    return rows;
  }
  async listAdmin() {return (await this.list()).sort((a,b)=>b.updated_at.localeCompare(a.updated_at));}
  async listPublished() {return (await this.list()).filter(b=>b.status==='published').sort((a,b)=>(b.published_at || b.created_at).localeCompare(a.published_at || a.created_at));}
  async findPublishedBySlug(slug: string) {
    const lookup=(await this.client.send(new GetCommand({TableName:this.table,Key:{pk:'SLUG#'+slug,sk:'LOOKUP'},ConsistentRead:true}))).Item;
    const post=lookup?await this.findById(lookup.id):null;
    return post?.status==='published' && post.slug===slug?post:null;
  }
  private async write(items: any[]) {
    try {await this.client.send(new TransactWriteCommand({TransactItems:items}));}
    catch(error:any) {
      if(error.name==='TransactionCanceledException' && error.CancellationReasons?.some((r:any)=>r.Code==='ConditionalCheckFailed' || r.Code==='TransactionConflict')) throw new ConflictException('Slug already exists or the post changed. Reload before retrying.');
      throw error;
    }
  }
  private record(blog: Blog, version=1): Stored {
    if(Buffer.byteLength(JSON.stringify(blog),'utf8')>350000)throw new BadRequestException('Post exceeds the storage size limit.');
    return {...blog,...this.key(blog.id),version};
  }
  async importPost(blog: Blog) {
    const existing=await this.findById(blog.id);
    if(existing) {
      if(Object.keys(blog).every(key=>JSON.stringify(existing[key as keyof Blog])===JSON.stringify(blog[key as keyof Blog])))return {post:existing,created:false};
      throw new ConflictException('An existing post differs from the import. No overwrite performed.');
    }
    const item=this.record(blog);
    await this.write([
      {Put:{TableName:this.table,Item:item,ConditionExpression:'attribute_not_exists(pk)'}},
      {Put:{TableName:this.table,Item:{pk:'SLUG#'+blog.slug,sk:'LOOKUP',id:blog.id},ConditionExpression:'attribute_not_exists(pk)'}},
      {Put:{TableName:this.table,Item:{pk:'INDEX#BLOGS',sk:blog.created_at+'#'+blog.id,id:blog.id},ConditionExpression:'attribute_not_exists(pk)'}}
    ]);
    return {post:publicBlog(item),created:true};
  }
  async create(input: BlogWrite) {
    const time=new Date().toISOString();
    return (await this.importPost({...input,id:randomUUID(),created_at:time,updated_at:time})).post;
  }
  async update(id: string,input: BlogWrite) {
    const current=await this.load(id);if(!current)return null;
    const updated=this.record({...publicBlog(current),...input,updated_at:new Date().toISOString()},current.version+1);
    const items:any[]=[{Put:{TableName:this.table,Item:updated,ConditionExpression:'#v = :v',ExpressionAttributeNames:{'#v':'version'},ExpressionAttributeValues:{':v':current.version}}}];
    if(input.slug!==current.slug)items.push(
      {Delete:{TableName:this.table,Key:{pk:'SLUG#'+current.slug,sk:'LOOKUP'},ConditionExpression:'id = :id',ExpressionAttributeValues:{':id':id}}},
      {Put:{TableName:this.table,Item:{pk:'SLUG#'+input.slug,sk:'LOOKUP',id},ConditionExpression:'attribute_not_exists(pk)'}}
    );
    await this.write(items);return publicBlog(updated);
  }
  async delete(id: string) {
    const current=await this.load(id);if(!current)return;
    await this.write([
      {Delete:{TableName:this.table,Key:this.key(id),ConditionExpression:'#v = :v',ExpressionAttributeNames:{'#v':'version'},ExpressionAttributeValues:{':v':current.version}}},
      {Delete:{TableName:this.table,Key:{pk:'SLUG#'+current.slug,sk:'LOOKUP'},ConditionExpression:'id = :id',ExpressionAttributeValues:{':id':id}}},
      {Delete:{TableName:this.table,Key:{pk:'INDEX#BLOGS',sk:current.created_at+'#'+id}}}
    ]);
  }
}
