import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, IsUrl, MinLength, MaxLength, ArrayMaxSize } from 'class-validator';
import { Transform } from 'class-transformer';
import { BlogStatus } from '../blog-status';

export class CreateBlogDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1800)
  summary?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200000)
  content_markdown: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({value})=>value===''?null:value)
  @IsUrl({ require_tld: false })
  cover_image?: string|null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(12)
  @MaxLength(40,{each:true})
  tags?: string[];

  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: BlogStatus;
}
