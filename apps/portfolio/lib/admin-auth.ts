import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, readAdminSession } from "./session";
export { hashAdminPassword, verifyAdminPassword, createAdminSession, readAdminSession } from "./session";
export async function getAdminSession() { return readAdminSession((await cookies()).get(SESSION_COOKIE)?.value); }
export const requireAdmin = getAdminSession;
export async function setAdminSessionCookie(token: string) { (await cookies()).set(SESSION_COOKIE,token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:SESSION_TTL_SECONDS}); }
export async function clearAdminSessionCookie() { (await cookies()).set(SESSION_COOKIE,"",{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:0}); }
