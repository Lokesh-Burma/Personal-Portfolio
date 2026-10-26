import { Module } from '@nestjs/common';
import { BlogsController } from './blogs.controller';
import { BlogsRepository } from './blogs.repository';
import { BlogsService } from './blogs.service';

@Module({
  controllers: [BlogsController],
  providers: [BlogsService, BlogsRepository],
})
export class BlogsModule {}
