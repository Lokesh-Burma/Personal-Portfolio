import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApplication, listenAddress } from './application';
export async function bootstrap() {
  const app=configureApplication(await NestFactory.create(AppModule,{bodyParser:false}));
  app.enableShutdownHooks();
  const address=listenAddress(process.env.AWS_LAMBDA_HTTP_ENDPOINT,app.get(ConfigService).get<number>('PORT') ?? 4000);
  await app.listen(address.port,address.host);
  return app;
}
if(require.main===module)void bootstrap();
