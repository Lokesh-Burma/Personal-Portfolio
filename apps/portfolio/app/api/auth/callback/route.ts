import {cookies} from "next/headers";
import {authConfig,consumeFlow,exchangeCode,FLOW_COOKIE,OWNER_COOKIE} from "@/lib/auth/cognito";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request:Request){const store=await cookies(),raw=store.get(FLOW_COOKIE)?.value;
 try{const c=authConfig(),params=new URL(request.url).searchParams;const flow=consumeFlow(raw,params.get("state"),c);store.set(FLOW_COOKIE,"",{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:0});if(params.has("error") || params.getAll("code").length!==1 || params.getAll("state").length!==1)throw new Error();const result=await exchangeCode(params.get("code") || "",flow,c);store.set(OWNER_COOKIE,result.token,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:Math.max(0,result.session.exp-Math.floor(Date.now()/1000))});return new Response(null,{status:303,headers:{location:c.origin+result.returnTo,"cache-control":"no-store","referrer-policy":"no-referrer"}});
 }catch{return new Response(null,{status:303,headers:{location:"/login?error=sign-in-failed","cache-control":"no-store","referrer-policy":"no-referrer"}});}}
