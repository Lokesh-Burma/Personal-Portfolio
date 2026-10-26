import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { configureApplication } from '../src/application';
import { BlogsRepository } from '../src/blogs/blogs.repository';
import { pbkdf2Sync } from 'node:crypto';
describe('Portfolio API integration',()=>{
 let app:INestApplication;let cookie:string;const posts:any[]=[];
 beforeAll(async()=>{
  process.env.DATABASE_URL='postgresql://unused:unused@127.0.0.1:1/unused';process.env.BLOG_STORAGE='postgres';process.env.ADMIN_EMAIL='owner@example.test';process.env.SESSION_SECRET='integration-test-secret';process.env.ADMIN_PASSWORD_HASH='pbkdf2:210000:test:'+pbkdf2Sync('test-password','test',210000,32,'sha256').toString('base64url');process.env.CORS_ORIGIN='https://lokeshburma.com';
  const store={listPublished:async()=>posts.filter(p=>p.status==='published'),listAdmin:async()=>posts,findById:async(id:string)=>posts.find(p=>p.id===id),findPublishedBySlug:async(slug:string)=>posts.find(p=>p.slug===slug && p.status==='published') || null,create:async(input:any)=>{const p={...input,id:'new',created_at:new Date().toISOString(),updated_at:new Date().toISOString()};posts.push(p);return p;}};
  const {AppModule}=await import('../src/app.module');
  const fixture=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(BlogsRepository).useValue(store).compile();
  app=configureApplication(fixture.createNestApplication({bodyParser:false}));await app.init();
 });
 afterAll(async()=>{await app?.close();});
 it('serves health and rejects unauthenticated administrative access',async()=>{await request(app.getHttpServer()).get('/health').expect(200);await request(app.getHttpServer()).get('/admin/blogs').expect(401);});
 it('blocks cross-site login before checking credentials',async()=>{await request(app.getHttpServer()).post('/auth/login').set('Origin','https://evil.test').send({email:'owner@example.test',password:'test-password'}).expect(403);});
 it('logs in and returns a session matching the portfolio contract',async()=>{const r=await request(app.getHttpServer()).post('/auth/login').set('Origin','https://lokeshburma.com').send({email:'owner@example.test',password:'test-password'}).expect(201);cookie=(r.headers['set-cookie'] as unknown as string[])[0].split(';')[0];expect(r.headers['set-cookie'][0]).toContain('HttpOnly');await request(app.getHttpServer()).get('/auth/session').set('Cookie',cookie).expect(200).expect(({body})=>expect(body.authenticated).toBe(true));});
 it('accepts the actual editor shape including empty cover and keeps drafts private',async()=>{await request(app.getHttpServer()).post('/admin/blogs').set('Cookie',cookie).set('Origin','https://lokeshburma.com').send({title:'Cache Aside',slug:'cache-aside',summary:'Summary',content_markdown:'# Draft',cover_image:'',tags:['techcanvas'],status:'draft'}).expect(201).expect(({body})=>expect(body.post.cover_image).toBeNull());await request(app.getHttpServer()).get('/blogs').expect(200).expect({posts:[]});await request(app.getHttpServer()).get('/blogs/cache-aside').expect(404);});
 it('rejects unexpected fields and oversized payloads',async()=>{await request(app.getHttpServer()).post('/admin/blogs').set('Cookie',cookie).send({title:'Valid',content_markdown:'Text',role:'admin'}).expect(400);await request(app.getHttpServer()).post('/admin/blogs').set('Cookie',cookie).send({title:'Valid',content_markdown:'x'.repeat(260000)}).expect(413);});
 it('clears the session cookie on logout',async()=>{await request(app.getHttpServer()).post('/auth/logout').set('Cookie',cookie).expect(201).expect(({headers})=>expect(headers['set-cookie'][0]).toContain('Expires=Thu, 01 Jan 1970'));});
});
