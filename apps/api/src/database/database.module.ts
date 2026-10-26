import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export const PG_POOL = Symbol('PG_POOL');

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get('BLOG_STORAGE')==='dynamodb'?null:
        new Pool({
          connectionString: config.getOrThrow<string>('DATABASE_URL'),
          max: 2, connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000,
        }),
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool|null) {}

  async onApplicationShutdown() {
    await this.pool?.end();
  }
}
