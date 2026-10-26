import { localDemoEnabled } from "./local-state.ts";
export class RequestError extends Error { status: number; constructor(status: number,message: string) { super(message);this.status=status; } }
export function checkRequest(request: Request) {
  const url=new URL(request.url);
  const host=new URL("http://"+(request.headers.get("host") || url.host)).hostname;
  if(localDemoEnabled() && !["localhost","127.0.0.1","[::1]"].includes(host))throw new RequestError(403,"Local demo is loopback only.");
  if(["GET","HEAD"].includes(request.method))return;
  const origin=request.headers.get("origin"),expected=process.env.SITE_ORIGIN || url.origin;
  if((origin && origin!==expected) || request.headers.get("sec-fetch-site")==="cross-site")throw new RequestError(403,"Cross-site requests are not allowed.");
}
export async function readJson(request: Request,max=256000) {
  if(!request.headers.get("content-type")?.startsWith("application/json"))throw new RequestError(415,"Use application/json.");
  const reader=request.body?.getReader();if(!reader)throw new RequestError(400,"Expected JSON.");let total=0;const chunks=[];
  for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>max){await reader.cancel();throw new RequestError(413,"Request is too large.");}chunks.push(value);}
  try{return JSON.parse(Buffer.concat(chunks).toString("utf8"));}catch{throw new RequestError(400,"Invalid JSON.");}
}
export function errorResponse(error: any) { const status=Number.isInteger(error?.status)?error.status:503;return Response.json({error:status<500?error.message:"Service is temporarily unavailable."},{status,headers:{"cache-control":"no-store"}}); }
export function json(value: unknown,status=200) { return Response.json(value,{status,headers:{"cache-control":"no-store"}}); }
