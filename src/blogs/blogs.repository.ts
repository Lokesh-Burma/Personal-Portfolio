import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { Blog } from './blog.entity';
import { BlogStatus } from './blog-status';

type BlogWrite = {
  title: string;
  slug: string;
  summary: string | null;
  content_markdown: string;
  cover_image: string | null;
  tags: string[];
  status: BlogStatus;
  published_at: string | null;
};

@Injectable()
export class BlogsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async listPublished() {
    const result = await this.pool.query<Blog>(
      'select * from blogs where status = $1 order by published_at desc nulls last, created_at desc',
      ['published'],
    );
    return result.rows;
  }

  async findPublishedBySlug(slug: string) {
    const result = await this.pool.query<Blog>('select * from blogs where slug = $1 and status = $2 limit 1', [
      slug,
      'published',
    ]);
    return result.rows[0] ?? null;
  }

  async listAdmin() {
    const result = await this.pool.query<Blog>('select * from blogs order by updated_at desc');
    return result.rows;
  }

  async create(input: BlogWrite) {
    const result = await this.pool.query<Blog>(
            'insert into blogs (title, slug, summary, content_markdown, cover_image, tags, status, published_at) values ($1,$2,$3,$4,$5,$6,$7,$8) returning *',
      [input.title, input.slug, input.summary, input.content_markdown, input.cover_image, input.tags, input.status, input.published_at],
    );
    return result.rows[0];
  }

  async update(id: string, input: BlogWrite) {
    const result = await this.pool.query<Blog>(
            'update blogs set title=$1, slug=$2, summary=$3, content_markdown=$4, cover_image=$5, tags=$6, status=$7, published_at=$8, updated_at=now() where id=$9 returning *',
      [input.title, input.slug, input.summary, input.content_markdown, input.cover_image, input.tags, input.status, input.published_at, id],
    );
    return result.rows[0] ?? null;
  }

  async delete(id: string) {
    await this.pool.query('delete from blogs where id = $1', [id]);
  }
}
