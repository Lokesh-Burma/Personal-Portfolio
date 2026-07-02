import 'reflect-metadata';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN')?.split(',') ?? true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const docsConfig = new DocumentBuilder()
    .setTitle('Portfolio API')
    .setDescription('Standalone NestJS backend for portfolio content and admin workflows')
    .setVersion('0.1.0')
    .addCookieAuth('portfolio_admin_session')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, docsConfig));

  await app.listen(config.get<number>('PORT') ?? 4000);
}

void bootstrap();
