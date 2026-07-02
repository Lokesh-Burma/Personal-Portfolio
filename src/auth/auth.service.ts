import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

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

  verifyPassword(password: string) {
    const configuredHash = this.config.getOrThrow<string>('ADMIN_PASSWORD_HASH');
    const [scheme, iterationsValue, salt, storedHash] = configuredHash.split(':');

    if (scheme !== 'pbkdf2' || !iterationsValue || !salt || !storedHash) {
      throw new Error('ADMIN_PASSWORD_HASH must use pbkdf2:iterations:salt:hash');
    }

    const iterations = Number(iterationsValue);
    const actual = Buffer.from(pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64url'));
    const expected = Buffer.from(storedHash);

    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  login(email: string, password: string) {
    if (email !== this.config.getOrThrow<string>('ADMIN_EMAIL') || !this.verifyPassword(password)) {
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

    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature || this.sign(encodedPayload) !== signature) return null;

    try {
      const session = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString()) as AdminSession;
      if (session.exp < Math.floor(Date.now() / 1000)) return null;
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
