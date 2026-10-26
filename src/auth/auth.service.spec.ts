import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { createHmac } from 'node:crypto';
describe('Owner sessions',()=>{
 const secret='test-session-secret';
 const config=new ConfigService({ADMIN_EMAIL:'owner@example.test',SESSION_SECRET:secret,SESSION_TTL_SECONDS:3600});
 const service=new AuthService(config);
 it('accepts its valid owner session and rejects altered or suffixed tokens',()=>{
  const token=service.createSession('owner@example.test');expect(service.readSession(token)?.email).toBe('owner@example.test');expect(service.readSession(token+'.extra')).toBeNull();expect(service.readSession(token.slice(0,-2)+'xx')).toBeNull();
 });
 it('rejects expired, invalid expiry and other-owner signed sessions',()=>{
  for(const data of [{email:'owner@example.test',exp:0},{email:'owner@example.test',exp:'9999999999'},{email:'other@example.test',exp:9999999999}]){const payload=Buffer.from(JSON.stringify(data)).toString('base64url');const signature=createHmac('sha256',secret).update(payload).digest('base64url');expect(service.readSession(payload+'.'+signature)).toBeNull();}
 });
});
