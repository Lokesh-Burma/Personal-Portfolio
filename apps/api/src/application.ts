import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json, Request, Response, NextFunction } from 'express';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
export function configureApplication(app: INestApplication) {
  const config=app.get(ConfigService);
  const allowed=new Set((config.get<string>('CORS_ORIGIN') || 'http://localhost:3000').split(',').map(v=>v.trim()).filter(Boolean));
  app.use(helmet());app.use(json({limit:256000}));app.use(cookieParser());
  app.use((request:Request,response:Response,next:NextFunction)=>{
    if(!['GET','HEAD','OPTIONS'].includes(request.method)) {
      const origin=request.headers.origin;
      if((origin && !allowed.has(origin)) || request.headers['sec-fetch-site']==='cross-site') {response.status(403).json({message:'Cross-site writes are not allowed.'});return;}
    }
    next();
  });
  app.enableCors({origin:(origin,callback)=>callback(null,!origin || allowed.has(origin)),credentials:true});
  app.useGlobalPipes(new ValidationPipe({whitelist:true,transform:true,forbidNonWhitelisted:true}));
  app.useGlobalFilters(new HttpExceptionFilter());
  if(config.get('NODE_ENV')!=='production' || config.get('ENABLE_API_DOCS')==='true') {
    const docs=new DocumentBuilder().setTitle('Portfolio Content API').setDescription('Content and owner publishing for the portfolio and TechCanvas workflow').setVersion('0.2.0').addCookieAuth('portfolio_admin_session').build();
    SwaggerModule.setup('docs',app,SwaggerModule.createDocument(app,docs));
  }
  return app;
}
export function listenAddress(endpoint: string|undefined,localPort=4000) {
  if(!endpoint)return {host:'127.0.0.1',port:localPort};
  const url=new URL('http://'+endpoint);
  const port=Number(url.port);
  if(url.pathname!=='/' || url.username || url.password || !port || port>65535)throw new Error('Invalid AWS_LAMBDA_HTTP_ENDPOINT');
  return {host:url.hostname.replace(/^\[|\]$/g,''),port};
}
