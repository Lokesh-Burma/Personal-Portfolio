import { Injectable, NotFoundException } from '@nestjs/common';
import { BlogStatus } from './blog-status';
import { BlogsRepository } from './blogs.repository';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';

type BlogWriteModel = {
  title: string;
  slug?: string;
  summary?: string | null;
  content_markdown: string;
  cover_image?: string | null;
  tags?: string[];
  status?: BlogStatus;
};

@Injectable()
export class BlogsService {
  constructor(private readonly blogsRepository: BlogsRepository) {}

  listPublished() {
    return this.blogsRepository.listPublished();
  }

  async findPublishedBySlug(slug: string) {
    const post = await this.blogsRepository.findPublishedBySlug(slug);
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  listAdmin() {
    return this.blogsRepository.listAdmin();
  }

  create(dto: CreateBlogDto) {
    return this.blogsRepository.create(this.toWriteModel(dto));
  }

  async update(id: string, dto: UpdateBlogDto) {
    const existing = (await this.blogsRepository.listAdmin()).find((post) => post.id === id);
    if (!existing) throw new NotFoundException('Post not found');

    const updated = await this.blogsRepository.update(
      id,
      this.toWriteModel({
        title: dto.title ?? existing.title,
        slug: dto.slug ?? existing.slug,
        summary: dto.summary ?? existing.summary,
        content_markdown: dto.content_markdown ?? existing.content_markdown,
        cover_image: dto.cover_image ?? existing.cover_image,
        tags: dto.tags ?? existing.tags,
        status: dto.status ?? existing.status,
      }),
    );

    if (!updated) throw new NotFoundException('Post not found');
    return updated;
  }

  delete(id: string) {
    return this.blogsRepository.delete(id);
  }

  private toWriteModel(input: BlogWriteModel) {
    const status: BlogStatus = input.status === 'published' ? 'published' : 'draft';
    return {
      title: input.title.trim(),
      slug: this.slugify(input.slug || input.title),
      summary: input.summary?.trim() || null,
      content_markdown: input.content_markdown,
      cover_image: input.cover_image?.trim() || null,
      tags: input.tags?.map((tag) => tag.trim()).filter(Boolean) || [],
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
    };
  }

  private slugify(value: string) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
}
