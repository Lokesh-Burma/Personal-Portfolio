import { randomUUID,createHash } from "node:crypto";
import { localDemoEnabled,localState } from "../local-state.ts";
import { RequestError } from "../http.ts";
import { catalog,assetNames } from "./content.mjs";
import { createService,publicJob,jobIdValid,renderAssets } from "./service.mjs";
import { Repository } from "./repository.mjs";
import { generationControls,cloudJobInput,cloudRetryInput } from "./activation.mjs";
import { privateAssets } from "./aws-assets.mjs";
import {imagePricing,refinementInput} from "./pricing.mjs";
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
const topics=Object.keys(catalog);
let cloudInstance: {owner:string;assets:ReturnType<typeof privateAssets>;service:ReturnType<typeof createService>} | undefined;
function cloud() {
 if(cloudInstance)return cloudInstance;
 const table=process.env.TECHCANVAS_TABLE_NAME,bucket=process.env.TECHCANVAS_ASSETS_BUCKET,owner=process.env.TECHCANVAS_OWNER_SUBJECT;
 if(process.env.AWS_REGION && process.env.AWS_REGION!=="ap-southeast-2")throw new RequestError(503,"Unsupported region.");
 if(!table || !bucket || !owner || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(owner))throw new RequestError(503,"TechCanvas storage is not configured.");
 return cloudInstance={owner,assets:privateAssets(bucket),service:createService({repo:new Repository({table,client:undefined}),enabled:false} as any)};
}
export async function studioConfig() {
 const demo=localDemoEnabled(),controls=generationControls();
 return {mode:demo?"demo":"cloud",ready:demo || controls.ready,imageGeneration:!demo && controls.imageGeneration,refinement:!demo && controls.imageGeneration && process.env.TECHCANVAS_IMAGE_REFINEMENT_APPROVED==="true",pricing:imagePricing,reviewReady:demo||process.env.TECHCANVAS_LIBRARY_WRITES_APPROVED==="true",topics,notice:demo?"Curated demo: SVG visuals, no model calls.":controls.ready?"Cloud generation uses reserved attempts. Review all content before publishing.":"Paid generation is paused. Existing jobs remain available when storage is configured."};
}
export async function studioList(cursor?:string) { if(!localDemoEnabled()){const c=cloud();return c.service.list(c.owner,cursor);}return localState(s=>({jobs:Object.values(s.jobs || {}).map((j:any)=>({...publicJob(j),provider:"demo"})),nextCursor:null})); }
export async function studioGet(id:string):Promise<any> {
 if(!jobIdValid(id))throw new RequestError(404,"Job not found.");
 if(localDemoEnabled())return localState(s=>{const j=s.jobs?.[id];if(!j)throw new RequestError(404,"Job not found.");return {...publicJob(j),provider:"demo",assets:Object.fromEntries([...assetNames].map(n=>[n,`/api/techcanvas/jobs/${id}/assets/${n}`]))};});
 const c=cloud(),j=await c.service.get(c.owner,id);if(!j)throw new RequestError(404,"Job not found.");return {...publicJob(j),assets:await c.assets.urls(c.owner,j)};
}
export async function studioCreate(input:any,key:string|null):Promise<any> {
 if(!localDemoEnabled()){
  const request=cloudJobInput(input,generationControls()),c=cloud();
  return publicJob(await c.service.create(c.owner,request.topic,key,undefined,{generateImage:request.generateImage}));
 }
 if(!input || typeof input!=="object" || Array.isArray(input) || Object.keys(input).some(k=>k!=="topic") || !Object.hasOwn(catalog,input.topic))throw new RequestError(400,"Choose a curated example topic.");
 if(!key || !/^[A-Za-z0-9_-]{8,100}$/.test(key))throw new RequestError(400,"Supply a stable Idempotency-Key.");
 const topic=input.topic as keyof typeof catalog;
 return localState(s=>{
  s.jobs ||= {};s.studioKeys ||= {};const fingerprint=hash(topic),previous=s.studioKeys[key];
  if(previous){if(previous.fingerprint!==fingerprint)throw new RequestError(409,"Key was used for different input.");return {...publicJob(s.jobs[previous.id]),provider:"demo"};}
  if(Object.keys(s.jobs).length>=100)throw new RequestError(429,"Local demo history is full.");
  const id=Date.now().toString(36).padStart(10,"0")+"-"+randomUUID(),content=catalog[topic];
  const files=renderAssets(topic,content,"demo");
  const j={id,topic,content,files,status:"completed",created:new Date().toISOString(),attempts:0,revision:0};s.jobs[id]=j;s.studioKeys[key]={id,fingerprint};return {...publicJob(j),provider:"demo"};
 });
}
export async function studioRetry(id:string,input:any,key:string|null):Promise<any> {
 if(localDemoEnabled())throw new RequestError(409,"Curated demo packs do not need a model retry.");
 cloudRetryInput(input,generationControls());
 if(!jobIdValid(id))throw new RequestError(404,"Job not found.");
 const c=cloud(),previous=await c.service.get(c.owner,id);
 if(previous?.generateImage && !generationControls().imageGeneration)throw new RequestError(503,"Image generation awaits separate activation approval.");
 return publicJob(await c.service.create(c.owner,undefined,key,id));
}
export async function studioAsset(id:string,name:string):Promise<{body?:string;url?:string;type:string}> {
 if(!assetNames.has(name) && name!=="illustration.png")throw new RequestError(404,"Asset not found.");const job=await studioGet(id);
 if(name==="illustration.png" && !job.assets?.[name])throw new RequestError(404,"Image is not available.");
 const type=name.endsWith(".png")?"image/png":name.endsWith(".svg")?"image/svg+xml":name.endsWith(".json")?"application/json":"text/plain; charset=utf-8";
 if(job.status!=="completed")throw new RequestError(409,"Assets are not ready.");
 if(localDemoEnabled())return localState(s=>({body:s.jobs[id].files[name],type}));return {url:job.assets[name],type};
}
export async function studioDraft(id:string) {const asset=await studioAsset(id,"portfolio.json");if(asset.body)return asset.body;
 const response=await fetch(asset.url!,{cache:"no-store",redirect:"error",signal:AbortSignal.timeout(5000)});if(!response.ok)throw new RequestError(503,"Draft asset unavailable.");
 const reader=response.body?.getReader();if(!reader)throw new RequestError(503,"Draft unavailable.");const chunks=[];let bytes=0;for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>256000){await reader.cancel();throw new RequestError(413,"Draft is too large.");}chunks.push(value);}return Buffer.concat(chunks).toString("utf8");
}

export async function studioLibrary(cursor?:string,search="",status="all",reviewed=false){
 if(search.length>120||!["all","completed","failed","queued","running"].includes(status))throw new RequestError(400,"Invalid library filter.");
 const jobs:any[]=[];let next=cursor||undefined;
 for(let page=0;page<10;page++){
  const result=await studioList(next);
  jobs.push(...result.jobs.filter((j:any)=>j.topic.toLowerCase().includes(search.toLowerCase())&&(status==="all"||j.status===status)&&(!reviewed||j.reviewed)));
  next=result.nextCursor||undefined;
  if(!next||jobs.length>=25)break;
 }
 return {jobs,nextCursor:next||null};
}
export async function studioUsage(){
 if(localDemoEnabled())return {month:new Date().toISOString().slice(0,7),dailyUsed:0,monthlyUsed:0,knownCostUSD:0,knownUsageCount:0,unknownCostAttempts:0,pricing:imagePricing,demo:true};
 return cloud().service.imageQuota();
}
export async function studioReview(id:string,input:any){
 if(!jobIdValid(id)||!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).length!==1||typeof input.reviewed!=="boolean")throw new RequestError(400,"Expected a reviewed flag.");
 if(localDemoEnabled())return localState(s=>{const job=s.jobs?.[id];if(!job||job.status!=="completed")throw new RequestError(404,"Completed pack not found.");job.reviewed=input.reviewed;job.reviewedAt=input.reviewed?new Date().toISOString():null;return {...publicJob(job),provider:"demo"};});
 if(process.env.TECHCANVAS_LIBRARY_WRITES_APPROVED!=="true")throw new RequestError(503,"Library review writes await configuration approval.");
 const c=cloud();return c.service.review(c.owner,id,input.reviewed);
}
export async function studioRefine(id:string,input:any,key:string|null){
 const controls=generationControls();
 if(localDemoEnabled()||!controls.imageGeneration||process.env.TECHCANVAS_IMAGE_REFINEMENT_APPROVED!=="true")throw new RequestError(503,"Image refinement awaits activation approval. No paid call was made.");
 const instructions=refinementInput(input);
 if(!jobIdValid(id))throw new RequestError(404,"Image not found.");
 const c=cloud();const parent=await c.service.get(c.owner,id);
 if(!parent||parent.status!=="completed"||parent.imageStatus!=="completed")throw new RequestError(409,"Refine a completed image.");
 return publicJob(await c.service.create(c.owner,parent.topic,key,undefined,{generateImage:true,parentId:id,instructions}));
}
