import { requireAdmin } from "@/lib/admin-auth";
import { checkRequest, readJson, json, errorResponse, RequestError } from "@/lib/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { createPost,listAdminPosts } from "@/lib/blog-db";
async function authorize(request:Request) {checkRequest(request);if(!await requireAdmin())throw new RequestError(401,"Unauthorized");}
export async function GET(request:Request){try{await authorize(request);return json({posts:await listAdminPosts()});}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{await authorize(request);return json({post:await createPost(await readJson(request))},201);}catch(e){return errorResponse(e);}}
