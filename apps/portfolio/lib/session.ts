import { createHmac, pbkdf2, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
export const SESSION_COOKIE = "portfolio_admin_session";
export const SESSION_TTL_SECONDS = 28800;
function sign(value: string) { const secret=process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET; if (!secret || secret.length < 32) throw new Error("A session secret of at least 32 characters is required."); return createHmac("sha256",secret).update(value).digest("base64url"); }
export function hashAdminPassword(password: string) { const salt=randomBytes(16).toString("base64url"); return `pbkdf2:210000:${salt}:${pbkdf2Sync(password,salt,210000,32,"sha256").toString("base64url")}`; }
export async function verifyAdminPassword(password: unknown) {
  if (typeof password !== "string" || password.length > 1024) return false;
  const parts=(process.env.ADMIN_PASSWORD_HASH || "").split(":"),[scheme,n,salt,stored]=parts,iterations=Number(n);
  if(parts.length!==4 || scheme!=="pbkdf2" || !salt || !stored || !Number.isInteger(iterations) || iterations<100000 || iterations>1000000)throw new Error("Invalid password hash configuration.");
  const actual=Buffer.from((await promisify(pbkdf2)(password,salt,iterations,32,"sha256")).toString("base64url")),expected=Buffer.from(stored);
  return actual.length===expected.length && timingSafeEqual(actual,expected);
}
export function createAdminSession(email: string) { const value=Buffer.from(JSON.stringify({email,exp:Math.floor(Date.now()/1000)+SESSION_TTL_SECONDS})).toString("base64url");return value+"."+sign(value); }
export function readAdminSession(token?: string): {email:string;exp:number}|null {
  if(!token || token.length>8192)return null;
  const parts=token.split(".");if(parts.length!==2 || !parts[0] || !parts[1])return null;
  try {const expected=Buffer.from(sign(parts[0])),actual=Buffer.from(parts[1]);if(actual.length!==expected.length || !timingSafeEqual(actual,expected))return null;const p=JSON.parse(Buffer.from(parts[0],"base64url").toString());if(typeof p.email!=="string" || !p.email || p.email!==process.env.ADMIN_EMAIL || !Number.isSafeInteger(p.exp) || p.exp<=Math.floor(Date.now()/1000))return null;return p;}catch{return null;}
}
