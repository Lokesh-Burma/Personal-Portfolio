import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, readAdminSession } from "./session";
import { localDemoEnabled } from "./local-state";
import { authConfig, verifyOwnerAccess, OWNER_COOKIE, FLOW_COOKIE } from "./auth/cognito";
export { hashAdminPassword, verifyAdminPassword, createAdminSession, readAdminSession } from "./session";
export async function getAdminSession() {
  const store=await cookies();
  if(localDemoEnabled())return readAdminSession(store.get(SESSION_COOKIE)?.value);
  const token=store.get(OWNER_COOKIE)?.value;if(!token)return null;
  try{return await verifyOwnerAccess(token,authConfig());}catch{return null;}
}
export const requireAdmin=getAdminSession;
export async function setAdminSessionCookie(token:string) {
  if(!localDemoEnabled())throw new Error("Password-only sessions are local-demo only.");
  (await cookies()).set(SESSION_COOKIE,token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:SESSION_TTL_SECONDS});
}
export async function clearAdminSessionCookie() {
  const store=await cookies();
  for(const name of [SESSION_COOKIE,OWNER_COOKIE,FLOW_COOKIE])store.set(name,"",{httpOnly:true,sameSite:"lax",secure:name.startsWith("__Host-") || process.env.NODE_ENV==="production",path:"/",maxAge:0});
}
