import { cp, mkdir, readFile, writeFile, readdir, rm, mkdtemp, readlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, dirname, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
const root=resolve('.'),destination=join(root,'.aws-build/api');
await rm(destination,{recursive:true,force:true});await mkdir(destination,{recursive:true});
const isolated=await mkdtemp(join(tmpdir(),'portfolio-api-package-'));
try {
  for(const file of ['package.json','pnpm-lock.yaml'])await cp(join(root,file),join(isolated,file));
  execFileSync('pnpm',['install','--prod','--frozen-lockfile','--ignore-scripts'],{cwd:isolated,stdio:'inherit'});
  await cp(join(isolated,'node_modules'),join(destination,'node_modules'),{recursive:true,dereference:false,verbatimSymlinks:true});
  await cp(join(root,'package.json'),join(destination,'package.json'));
} finally { await rm(isolated,{recursive:true,force:true}); }
await cp(join(root,'dist'),join(destination,'dist'),{recursive:true});
await cp(join(root,'aws/index.js'),join(destination,'index.js'));
let files=0,bytes=0,native=0;
async function inspect(path){for(const entry of await readdir(path,{withFileTypes:true})){const p=join(path,entry.name);if(entry.isDirectory())await inspect(p);else if(entry.isSymbolicLink()){const target=resolve(dirname(p),await readlink(p));if(!target.startsWith(destination+sep))throw new Error('Package symlink escapes artifact');}else if(entry.isFile()){if(entry.name.startsWith('.env'))throw new Error('Unexpected environment file');bytes+=(await readFile(p)).length;files++;if(entry.name.endsWith('.node'))native++;}}}
await inspect(destination);
await writeFile(join(destination,'build-manifest.json'),JSON.stringify({runtime:'nodejs24.x',entrypoint:'index.js',files,bytes,nativeAddons:native,platform:process.platform,linuxStartupVerified:false},null,2));
console.log(JSON.stringify({directory:destination,files,bytes,nativeAddons:native}));
