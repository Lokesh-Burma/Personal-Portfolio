import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { BlogsService } from './blogs.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';

@ApiTags('blogs')
@Controller()
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Public()
  @Get('blogs')
  async listPublished() {
    return { posts: await this.blogsService.listPublished() };
  }

  @Public()
  @Get('blogs/:slug')
  async getPublished(@Param('slug') slug: string) {
    return { post: await this.blogsService.findPublishedBySlug(slug) };
  }

  @ApiCookieAuth('portfolio_admin_session')
  @Get('admin/blogs')
  async listAdmin() {
    return { posts: await this.blogsService.listAdmin() };
  }

  @ApiCookieAuth('portfolio_admin_session')
  @Post('admin/blogs')
  async create(@Body() dto: CreateBlogDto) {
    return { post: await this.blogsService.create(dto) };
  }

  @ApiCookieAuth('portfolio_admin_session')
  @Patch('admin/blogs/:id')
  async update(@Param('id') id: string, @Body() dto: UpdateBlogDto) {
    return { post: await this.blogsService.update(id, dto) };
  }

  @ApiCookieAuth('portfolio_admin_session')
  @Delete('admin/blogs/:id')
  async delete(@Param('id') id: string) {
    await this.blogsService.delete(id);
    return { ok: true };
  }
}
