import { requireAdmin } from "@/lib/admin-auth";
import { checkRequest, readJson, json, errorResponse, RequestError } from "@/lib/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { updatePost,deletePost } from "@/lib/blog-db";
type Params={params:Promise<{id:string}>};
async function authorize(request:Request){checkRequest(request);if(!await requireAdmin())throw new RequestError(401,"Unauthorized");}
export async function PATCH(request:Request,{params}:Params){try{await authorize(request);const post=await updatePost((await params).id,await readJson(request));if(!post)throw new RequestError(404,"Post not found");return json({post});}catch(e){return errorResponse(e);}}
export async function DELETE(request:Request,{params}:Params){try{await authorize(request);await deletePost((await params).id);return json({ok:true});}catch(e){return errorResponse(e);}}
