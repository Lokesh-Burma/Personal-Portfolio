import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {mkdirSync,existsSync} from 'node:fs';
import {projects,targets,parseTarget} from './workspace-config.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
function run(command,cwd=root){console.log('\n['+cwd.slice(root.length)+'] '+command.join(' '));const result=spawnSync(command[0],command.slice(1),{cwd,stdio:'inherit',env:{...process.env,CI:process.env.CI||'true',NEXT_TELEMETRY_DISABLED:'1',GOTOOLCHAIN:'local'}});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);}
const [action,...args]=process.argv.slice(2),target=parseTarget(args),selected=target==='all'?targets:[target];
if(action==='install'){
  for(const name of selected)for(const command of projects[name].install)run(command,join(root,projects[name].directory));
  if(selected.some(t=>['portfolio','api'].includes(t)))run(['npm','ci','--ignore-scripts'],join(root,'infra'));
  if(selected.some(t=>['techcanvas','worker'].includes(t)))run(['npm','ci','--ignore-scripts'],join(root,'apps/techcanvas/infra'));
}else if(action==='check'){
  run([process.execPath,'--test','test/workspace.test.mjs']);
  if(selected.includes('api'))run(['pnpm','build'],join(root,'apps/api'));
  if(selected.includes('techcanvas'))run(['npm','--prefix','infra','run','build'],join(root,'apps/techcanvas'));
  if(selected.includes('worker'))run([process.execPath,'scripts/sync-worker-data.mjs','--check']);
  for(const name of selected)for(const command of projects[name].check)run(command,join(root,projects[name].directory));
  if(selected.includes('worker'))run([process.execPath,'--experimental-strip-types','scripts/check-worker-contract.mjs']);
  if(selected.some(t=>['portfolio','api'].includes(t)))run(['npm','test'],join(root,'infra'));
}else if(action==='build'){
  for(const name of selected)for(const command of projects[name].build)run(command,join(root,projects[name].directory));
}else if(action==='build-aws'){
  const output=join(root,'.artifacts',new Date().toISOString().replace(/[:.]/g,'-'));mkdirSync(output,{recursive:true});
  for(const name of selected){
    if(name==='techcanvas'){run(['npm','--prefix','infra','run','build'],join(root,projects[name].directory));continue;}
    const project=join(root,projects[name].directory);
    run(['docker','build','--platform','linux/arm64',...(name==='worker'?['--target','artifact']:[]),'-f',join(project,name==='worker'?'Dockerfile':'aws/Dockerfile.build'),'--output','type=local,dest='+join(output,name),project]);
  }
  console.log('\nClean Linux build output: '+output+'\nTechCanvas bundles: apps/techcanvas/infra/build (frontend packaging still needs reviewed stack outputs).');
}else if(action==='synth'){
  if(selected.some(t=>['portfolio','api'].includes(t)))run(['npm','run','synth'],join(root,'infra'));
  if(selected.some(t=>['techcanvas','worker'].includes(t)))run(['npm','--prefix','infra','run','synth'],join(root,'apps/techcanvas'));
}else if(action==='browser'){
  for(const file of ['apps/api/dist/main.js','apps/portfolio/.next/BUILD_ID'])if(!existsSync(join(root,file)))throw new Error('Run pnpm build before browser verification.');
  run([process.execPath,'scripts/check-platform-browser.mjs'],join(root,'apps/portfolio'));
}else if(action==='dev'){
  if(selected.length!==1)throw new Error('Choose one dev target.');
  run(projects[selected[0]].dev,join(root,projects[selected[0]].directory));
}else throw new Error('Commands: install, check, build, build-aws, synth, browser, dev');
