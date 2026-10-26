import { cp, mkdir, readFile, writeFile, readdir, rm, realpath } from 'node:fs/promises';
import { basename, resolve, join } from 'node:path';
const preview=process.argv.includes('--local-preview');
if(process.platform!=='linux' && !preview)throw new Error('Build this package on Linux for AWS. Use --local-preview only to validate the current local platform; it is not a deployment artifact.');
const root=resolve('.'),destination=join(root,'.aws-build/portfolio');
await rm(destination,{recursive:true,force:true});await mkdir(destination,{recursive:true});
const filter=path=>!basename(path).startsWith('.env') && basename(path)!=='.git' && !path.includes('/.local-platform') && !path.includes('/content/drafts/') && !path.endsWith('/content/drafts');
await cp(join(root,'.next/standalone'),destination,{recursive:true,dereference:false,verbatimSymlinks:true,filter});
await cp(join(root,'public'),join(destination,'public'),{recursive:true,filter});
await cp(join(root,'.next/static'),join(destination,'.next/static'),{recursive:true});
await cp(join(root,'aws/index.js'),join(destination,'index.js'));
let bytes=0,files=0,native=0;
async function inspect(path){for(const e of await readdir(path,{withFileTypes:true})){const p=join(path,e.name);if(e.isSymbolicLink()){const target=await realpath(p);if(!target.startsWith(destination+'/'))throw new Error('Package link escapes artifact');continue;}if(e.isDirectory())await inspect(p);else{if(e.name.startsWith('.env'))throw new Error('Environment file detected');const b=await readFile(p);bytes+=b.length;files++;if(e.name.endsWith('.node'))native++;}}}
await inspect(destination);
await writeFile(join(destination,'build-manifest.json'),JSON.stringify({platform:process.platform,architecture:process.arch,linuxBuild:process.platform==='linux',previewOnly:preview,files,bytes,nativeAddons:native,entrypoint:'index.js',runtime:'nodejs24.x'},null,2));
console.log(JSON.stringify({directory:destination,files,bytes,nativeAddons:native,previewOnly:preview}));
