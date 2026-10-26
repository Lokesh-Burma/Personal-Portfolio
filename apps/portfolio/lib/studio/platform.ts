import { randomUUID,createHash } from "node:crypto";
import { localDemoEnabled,localState } from "../local-state.ts";
import { RequestError } from "../http.ts";
import { catalog,renderSvg,markdown,assetNames } from "./content.mjs";
import { renderMemorySvg } from "./memory.mjs";
import { createService,publicJob,jobIdValid } from "./service.mjs";
import { Repository } from "./repository.mjs";
import { privateAssets } from "./aws-assets.mjs";
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
export async function studioConfig() { return {mode:localDemoEnabled()?"demo":"cloud",ready:localDemoEnabled(),imageGeneration:false,topics,notice:localDemoEnabled()?"Curated demo: SVG visuals, no model calls.":"Paid generation is paused. Existing jobs remain available when storage is configured."}; }
export async function studioList(cursor?:string) { if(!localDemoEnabled()){const c=cloud();return c.service.list(c.owner,cursor);}return localState(s=>({jobs:Object.values(s.jobs || {}).map((j:any)=>({...publicJob(j),provider:"demo"})),nextCursor:null})); }
export async function studioGet(id:string):Promise<any> {
 if(!jobIdValid(id))throw new RequestError(404,"Job not found.");
 if(localDemoEnabled())return localState(s=>{const j=s.jobs?.[id];if(!j)throw new RequestError(404,"Job not found.");return {...publicJob(j),provider:"demo",assets:Object.fromEntries([...assetNames].map(n=>[n,`/api/techcanvas/jobs/${id}/assets/${n}`]))};});
 const c=cloud(),j=await c.service.get(c.owner,id);if(!j)throw new RequestError(404,"Job not found.");return {...publicJob(j),assets:await c.assets.urls(c.owner,j)};
}
export async function studioCreate(input:any,key:string|null):Promise<any> {
 if(!localDemoEnabled())throw new RequestError(503,"Generation awaits activation approval. No paid call was made.");
 if(!input || typeof input!=="object" || Array.isArray(input) || Object.keys(input).some(k=>k!=="topic") || !Object.hasOwn(catalog,input.topic))throw new RequestError(400,"Choose a curated example topic.");
 if(!key || !/^[A-Za-z0-9_-]{8,100}$/.test(key))throw new RequestError(400,"Supply a stable Idempotency-Key.");
 const topic=input.topic as keyof typeof catalog;
 return localState(s=>{
  s.jobs ||= {};s.studioKeys ||= {};const fingerprint=hash(topic),previous=s.studioKeys[key];
  if(previous){if(previous.fingerprint!==fingerprint)throw new RequestError(409,"Key was used for different input.");return {...publicJob(s.jobs[previous.id]),provider:"demo"};}
  if(Object.keys(s.jobs).length>=100)throw new RequestError(429,"Local demo history is full.");
  const id=Date.now().toString(36).padStart(10,"0")+"-"+randomUUID(),content=catalog[topic],md=markdown(topic,content);
  const files:Record<string,string>={"blog.md":md,"summary.svg":renderSvg(topic,content,null,"demo"),"memory.svg":renderMemorySvg(topic,content,"demo"),"portfolio.json":JSON.stringify({title:topic,summary:content.paragraph,content_markdown:md,tags:["techcanvas"],status:"draft"}),"caption.txt":content.sentence};
  content.concepts.forEach((_:unknown,i:number)=>{files[`concept-${i+1}.svg`]=renderSvg(topic,content,i,"demo");});
  const j={id,topic,content,files,status:"completed",created:new Date().toISOString(),attempts:0,revision:0};s.jobs[id]=j;s.studioKeys[key]={id,fingerprint};return {...publicJob(j),provider:"demo"};
 });
}
export async function studioAsset(id:string,name:string):Promise<{body?:string;url?:string;type:string}> {
 if(!assetNames.has(name))throw new RequestError(404,"Asset not found.");const job=await studioGet(id);
 const type=name.endsWith(".svg")?"image/svg+xml":name.endsWith(".json")?"application/json":"text/plain; charset=utf-8";
 if(job.status!=="completed")throw new RequestError(409,"Assets are not ready.");
 if(localDemoEnabled())return localState(s=>({body:s.jobs[id].files[name],type}));return {url:job.assets[name],type};
}
export async function studioDraft(id:string) {const asset=await studioAsset(id,"portfolio.json");if(asset.body)return asset.body;
 const response=await fetch(asset.url!,{cache:"no-store",redirect:"error",signal:AbortSignal.timeout(5000)});if(!response.ok)throw new RequestError(503,"Draft asset unavailable.");
 const reader=response.body?.getReader();if(!reader)throw new RequestError(503,"Draft unavailable.");const chunks=[];let bytes=0;for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>256000){await reader.cancel();throw new RequestError(413,"Draft is too large.");}chunks.push(value);}return Buffer.concat(chunks).toString("utf8");
}
