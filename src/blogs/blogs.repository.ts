import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { DynamoBlogsRepository } from './dynamo-blogs.repository';
import { PostgresBlogsRepository, BlogWrite } from './postgres-blogs.repository';
@Injectable()
export class BlogsRepository {
  private readonly store: DynamoBlogsRepository|PostgresBlogsRepository;
  constructor(@Inject(PG_POOL) pool: Pool|null, config: ConfigService) {
    if(config.get('BLOG_STORAGE')==='dynamodb')this.store=new DynamoBlogsRepository(config.getOrThrow<string>('BLOG_TABLE_NAME'));
    else {if(!pool)throw new Error('PostgreSQL pool unavailable');this.store=new PostgresBlogsRepository(pool);}
  }
  listPublished(){return this.store.listPublished();}
  findPublishedBySlug(slug:string){return this.store.findPublishedBySlug(slug);}
  findById(id:string){return this.store.findById(id);}
  listAdmin(){return this.store.listAdmin();}
  create(input:BlogWrite){return this.store.create(input);}
  update(id:string,input:BlogWrite){return this.store.update(id,input);}
  delete(id:string){return this.store.delete(id);}
}
