import { createAdminSession, setAdminSessionCookie, verifyAdminPassword } from "@/lib/admin-auth";
import { checkRequest, readJson, json, errorResponse } from "@/lib/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
 try { checkRequest(request); const body=await readJson(request,4096);
 if (!body || typeof body.email!=="string" || typeof body.password!=="string" || Object.keys(body).some(k=>!["email","password"].includes(k)) || body.email!==process.env.ADMIN_EMAIL || !await verifyAdminPassword(body.password)) return json({error:"Invalid credentials"},401);
 await setAdminSessionCookie(createAdminSession(body.email));return json({ok:true});
 } catch(error) { return errorResponse(error); }
}
