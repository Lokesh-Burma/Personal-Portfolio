import {cookies} from "next/headers";
import {authConfig,beginLogin,FLOW_COOKIE} from "@/lib/auth/cognito";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request:Request){try{const c=authConfig(),flow=beginLogin(c,new URL(request.url).searchParams.get("returnTo"));(await cookies()).set(FLOW_COOKIE,flow.cookie,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:600});return new Response(null,{status:303,headers:{location:flow.url,"cache-control":"no-store","referrer-policy":"no-referrer"}});}catch{return Response.json({error:"Owner MFA login is not configured."},{status:503,headers:{"cache-control":"no-store"}});}}
