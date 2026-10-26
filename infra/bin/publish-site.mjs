// Explicit deployment operation. Never run as part of build, synth or tests.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const input=process.argv[2];
if(!input || !process.argv.includes('--publish')) throw new Error('Usage: node infra/bin/publish-site.mjs /absolute/cdk-outputs.json --publish (requires deployment approval)');
const raw=JSON.parse(await readFile(input,'utf8')),out=raw.TechCanvasFoundation || raw;
if(!/^[a-z0-9.-]+$/.test(out.FrontendBucketName || '')) throw new Error('Missing reviewed frontend bucket output.');
const directory=fileURLToPath(new URL('../site-build/',import.meta.url));
const types={'index.html':'text/html; charset=utf-8','app.js':'text/javascript','style.css':'text/css','cloud-session.mjs':'text/javascript','cloud-config.json':'application/json'};
const packaged=JSON.parse(await readFile(directory+'cloud-config.json','utf8'));
for(const [field,key] of Object.entries({apiUrl:'ApiUrl',clientId:'ClientId',loginDomain:'LoginDomain',frontendUrl:'FrontendUrl'})) if(packaged[field]!==out[key]) throw new Error('Package does not match deployment outputs: '+field);
const profile=process.env.AWS_PROFILE || 'aws-toolkit';
const aws=process.env.TECHCANVAS_AWS_CLI || '/Users/lokeshburma/.local/bin/aws';
for(const [name,type] of Object.entries(types)) {
  const bytes=await readFile(directory+name),digest=createHash('sha256').update(bytes).digest('hex');
  execFileSync(aws,['s3api','put-object','--profile',profile,'--region','ap-southeast-2','--bucket',out.FrontendBucketName,'--key',name,'--body',directory+name,'--content-type',type,'--cache-control','no-store','--server-side-encryption','AES256','--metadata','sha256='+digest],{stdio:['ignore','ignore','pipe']});
  console.log('Published '+name);
}
console.log('Published five reviewed frontend files. No existing objects were deleted.');
