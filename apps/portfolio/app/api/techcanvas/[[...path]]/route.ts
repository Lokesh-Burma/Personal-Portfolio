import { requireAdmin } from "@/lib/admin-auth";
import { checkRequest, readJson, json, errorResponse, RequestError } from "@/lib/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { studioConfig,studioLibrary,studioUsage,studioReview,studioRefine,studioGet,studioCreate,studioRetry,studioAsset,studioDraft } from "@/lib/studio/platform";
import { parseTechCanvasDraft } from "@/lib/techcanvas-import";
import { createPost } from "@/lib/blog-db";
type Params={params:Promise<{path?:string[]}>};
async function handle(request:Request,{params}:Params){try{
 checkRequest(request);if(!await requireAdmin())throw new RequestError(401,"Unauthorized");
 const p=(await params).path || [],method=request.method;
 if(method==="GET" && p.join("/")==="config")return json(await studioConfig());
 if(method==="GET" && p.join("/")==="usage")return json(await studioUsage());
 if(p[0]==="jobs"){
  if(p.length===1 && method==="GET"){const q=new URL(request.url).searchParams;return json(await studioLibrary(q.get("cursor")||undefined,q.get("search")||"",q.get("status")||"all",q.get("reviewed")==="true"));}
  if(p.length===1 && method==="POST")return json(await studioCreate(await readJson(request,4096),request.headers.get("idempotency-key")),202);
  if(p.length===3 && p[2]==="review" && method==="POST")return json(await studioReview(p[1],await readJson(request,4096)));
  if(p.length===3 && p[2]==="refine" && method==="POST")return json(await studioRefine(p[1],await readJson(request,4096),request.headers.get("idempotency-key")),202);
  if(p.length===2 && method==="GET")return json(await studioGet(p[1]));
  if(p.length===4 && p[2]==="assets" && method==="GET"){const a=await studioAsset(p[1],p[3]);if(a.url)return new Response(null,{status:307,headers:{location:a.url,"cache-control":"private, no-store"}});return new Response(a.body,{headers:{"content-type":a.type,"cache-control":"private, no-store","content-security-policy":"default-src 'none'; style-src 'unsafe-inline'; sandbox","x-content-type-options":"nosniff"}});}
  if(p.length===3 && p[2]==="draft" && method==="POST"){
   const body=await readJson(request,4096);if(!body || typeof body!=="object" || Array.isArray(body) || Object.keys(body).length)throw new RequestError(400,"Expected an empty object.");
   const draft=parseTechCanvasDraft(await studioDraft(p[1]));const post=await createPost({...draft,tags:draft.tags.split(",").map(t=>t.trim()).filter(Boolean),cover_image:null,published_at:null,status:"draft"});return json({post},201);
  }
  if(p.length===3 && p[2]==="retry" && method==="POST")return json(await studioRetry(p[1],await readJson(request,4096),request.headers.get("idempotency-key")),202);
 }
 throw new RequestError(404,"Route not found.");
}catch(e){return errorResponse(e);}}
export const GET=handle;export const POST=handle;
