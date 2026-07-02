import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('App e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@localhost:5432/portfolio_api';
    process.env.ADMIN_EMAIL ||= 'admin@example.com';
    process.env.ADMIN_PASSWORD_HASH ||= 'pbkdf2:210000:test:test';
    process.env.SESSION_SECRET ||= 'test-secret';
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health', () => request(app.getHttpServer()).get('/health').expect(200));
});
