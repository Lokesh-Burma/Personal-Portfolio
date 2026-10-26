import { requireAdmin } from "@/lib/admin-auth";
import { checkRequest,json,errorResponse } from "@/lib/http";
export const dynamic="force-dynamic";
export async function GET(request:Request) { try {checkRequest(request);const s=await requireAdmin();return json({authenticated:Boolean(s),email:s?.email || null});}catch(e){return errorResponse(e);} }
