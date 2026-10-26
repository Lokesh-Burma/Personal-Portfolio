import { clearAdminSessionCookie } from "@/lib/admin-auth";
import { checkRequest,json,errorResponse } from "@/lib/http";
export async function POST(request:Request) { try {checkRequest(request);await clearAdminSessionCookie();return json({ok:true});}catch(e){return errorResponse(e);} }
