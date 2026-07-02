import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "portfolio_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

type SessionPayload = {
  email: string;
  exp: number;
};

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is required");
  }
  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function hashAdminPassword(password: string) {
  const iterations = 210000;
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url");
  return `pbkdf2:${iterations}:${salt}:${hash}`;
}

export function verifyAdminPassword(password: string) {
  const configuredHash = process.env.ADMIN_PASSWORD_HASH;

  if (!configuredHash && process.env.NODE_ENV !== "production" && process.env.ADMIN_PASSWORD) {
    return password === process.env.ADMIN_PASSWORD;
  }

  if (!configuredHash) {
    throw new Error("ADMIN_PASSWORD_HASH is required");
  }

  const [scheme, iterationsValue, salt, storedHash] = configuredHash.split(":");
  if (scheme !== "pbkdf2" || !iterationsValue || !salt || !storedHash) {
    throw new Error("ADMIN_PASSWORD_HASH must use pbkdf2:iterations:salt:hash");
  }

  const iterations = Number(iterationsValue);
  const actual = Buffer.from(
    pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url"),
  );
  const expected = Buffer.from(storedHash);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createAdminSession(email: string) {
  const payload: SessionPayload = {
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function readAdminSession(token?: string): SessionPayload | null {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || sign(encodedPayload) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString()) as SessionPayload;
    if (!payload.email || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  return readAdminSession(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session || session.email !== process.env.ADMIN_EMAIL) {
    return null;
  }
  return session;
}

export async function setAdminSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
