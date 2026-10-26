import { promisify } from 'node:util';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, pbkdf2, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

export type AdminSession = {
  email: string;
  exp: number;
};

@Injectable()
export class AuthService {
  constructor(private readonly config: ConfigService) {}

  hashPassword(password: string) {
    const iterations = 210000;
    const salt = randomBytes(16).toString('base64url');
    const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64url');
    return 'pbkdf2:' + iterations + ':' + salt + ':' + hash;
  }

  async verifyPassword(password: string) {
    const configuredHash = this.config.getOrThrow<string>('ADMIN_PASSWORD_HASH');
    const [scheme, iterationsValue, salt, storedHash] = configuredHash.split(':');

    if (scheme !== 'pbkdf2' || !iterationsValue || !salt || !storedHash) {
      throw new Error('ADMIN_PASSWORD_HASH must use pbkdf2:iterations:salt:hash');
    }

    const iterations = Number(iterationsValue);
    const derived=await promisify(pbkdf2)(password,salt,iterations,32,'sha256');
    const actual = Buffer.from(derived.toString('base64url'));
    const expected = Buffer.from(storedHash);

    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  async login(email: string, password: string) {
    if (email !== this.config.getOrThrow<string>('ADMIN_EMAIL') || !await this.verifyPassword(password)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createSession(email);
  }

  createSession(email: string) {
    const ttl = this.config.get<number>('SESSION_TTL_SECONDS') ?? 60 * 60 * 8;
    const payload: AdminSession = { email, exp: Math.floor(Date.now() / 1000) + ttl };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return encodedPayload + '.' + this.sign(encodedPayload);
  }

  readSession(token?: string): AdminSession | null {
    if (!token) return null;

    if(token.length>8192)return null;
    const parts=token.split('.');if(parts.length!==2)return null;
    const [encodedPayload,signature]=parts;
    if(!encodedPayload || !signature)return null;
    const expected=Buffer.from(this.sign(encodedPayload)),actual=Buffer.from(signature);
    if(expected.length!==actual.length || !timingSafeEqual(expected,actual))return null;

    try {
      const session = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString()) as AdminSession;
      if (!Number.isSafeInteger(session.exp) || session.exp <= Math.floor(Date.now() / 1000)) return null;
      if (session.email !== this.config.getOrThrow<string>('ADMIN_EMAIL')) return null;
      return session;
    } catch {
      return null;
    }
  }

  private sign(value: string) {
    return createHmac('sha256', this.config.getOrThrow<string>('SESSION_SECRET')).update(value).digest('base64url');
  }
}
