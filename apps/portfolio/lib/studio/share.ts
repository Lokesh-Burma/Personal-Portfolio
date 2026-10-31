export type SharePack={topic:string;content?:{paragraph:string;example:string;tradeoff:string};assets?:Record<string,string>};
type Format="image"|"social"|"poster";
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const filename=(topic:string)=>topic.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80)||"techcanvas";
async function source(pack:SharePack){
 const url=pack.assets?.["illustration.png"]||pack.assets?.["memory.svg"];
 if(!url)throw new Error("This pack has no saved image to export.");
 // Load through the image policy, not connect-src: production permits private S3
 // images but intentionally restricts script fetches to this application's origin.
 const image=new Image();image.crossOrigin="anonymous";
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  image.src=url;
  await Promise.race([image.decode(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{image.src="";reject(new Error("Image link expired or unavailable. Reopen the pack and try again."));},15000);})]);
  if(image.naturalWidth<1||image.naturalHeight<1||image.naturalWidth>4096||image.naturalHeight>4096)throw new Error("Image exceeds export bounds.");
  return image;
 }finally{if(timer)clearTimeout(timer);}

}
function lines(ctx:CanvasRenderingContext2D,text:string,width:number){
 const result:string[]=[];let line="";
 for(const word of text.split(/\s+/)){const next=line?line+" "+word:word;if(line&&ctx.measureText(next).width>width){result.push(line);line=word;}else line=next;}
 if(line)result.push(line);return result;
}
async function canvasFor(pack:SharePack,format:Format){
 const image=await source(pack),canvas=document.createElement("canvas");
 if(format==="image"){canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;canvas.getContext("2d")!.drawImage(image,0,0);return canvas;}
 canvas.width=format==="social"?1200:1600;canvas.height=format==="social"?630:2000;
 const ctx=canvas.getContext("2d")!;ctx.fillStyle="#0f172a";ctx.fillRect(0,0,canvas.width,canvas.height);
 const pad=format==="social"?36:64;
 ctx.fillStyle="#a5b4fc";ctx.font=`600 ${format==="social"?20:26}px system-ui`;ctx.fillText("TECHCANVAS · LEARNING NOTES",pad,pad+24);
 ctx.fillStyle="#f1f5f9";let font=format==="social"?36:56;
 ctx.font=`600 ${font}px system-ui`;
 while(lines(ctx,pack.topic,canvas.width-pad*2).length>2&&font>18){font-=2;ctx.font=`600 ${font}px system-ui`;}
 const titleLines=lines(ctx,pack.topic,canvas.width-pad*2);let y=pad+72;
 for(const line of titleLines){ctx.fillText(line,pad,y);y+=font+10;}
 const top=y+12,bottom=canvas.height-pad-32,available=bottom-top;
 const scale=Math.min((canvas.width-pad*2)/image.naturalWidth,available/image.naturalHeight);
 const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
 ctx.drawImage(image,(canvas.width-w)/2,top+(available-h)/2,w,h);
 ctx.fillStyle="#94a3b8";ctx.font=`400 ${format==="social"?16:22}px system-ui`;ctx.fillText("Draft learning visual · Review technical details before sharing",pad,canvas.height-pad);
 return canvas;
}
export async function exportPNG(pack:SharePack,format:Format){
 const canvas=await canvasFor(pack,format);
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("Export failed.")),"image/png"));
 const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename(pack.topic)+"-"+format+".png";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export async function printPack(pack:SharePack){
 // Open synchronously in the click handler so browsers do not block the print window.
 const preview=window.open("","_blank");if(!preview)throw new Error("Allow popups to open the printable learning sheet.");preview.opener=null;
 preview.document.title="Preparing learning sheet";
 try{
  const image=await canvasFor(pack,"image");
  preview.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escape(pack.topic)} · TechCanvas</title><style>body{font:15px/1.6 system-ui;color:#0f172a;max-width:850px;margin:32px auto;padding:0 20px}h1{line-height:1.2}img{width:100%;height:auto;break-inside:avoid}h2{break-after:avoid}button{padding:10px 18px} @page{size:A4;margin:16mm}@media print{button{display:none}body{margin:0;padding:0}img{max-height:150mm;object-fit:contain}}</style></head><body><button onclick="window.print()">Print / Save as PDF</button><p>TechCanvas · Learning notes</p><h1>${escape(pack.topic)}</h1><img alt="${escape(pack.topic)} diagram" src="${image.toDataURL("image/png")}">${pack.content?[['Explanation',pack.content.paragraph],['Example',pack.content.example],['Tradeoffs',pack.content.tradeoff]].map(([title,text])=>`<h2>${title}</h2><p>${escape(text).replace(/\n/g,"<br>")}</p>`).join(""):''}<p>Review this draft for technical accuracy before sharing.</p></body></html>`);
  preview.document.close();
 }catch(error){preview.close();throw error;}
}
