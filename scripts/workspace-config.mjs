export const targets = ['portfolio', 'api', 'techcanvas'];
export const projects = {
  portfolio: {directory:'apps/portfolio',install:[['pnpm','install','--frozen-lockfile','--ignore-scripts']],check:[['pnpm','test']],build:[['pnpm','build']],dev:['pnpm','dev']},
  api: {directory:'apps/api',install:[['pnpm','install','--frozen-lockfile','--ignore-scripts']],check:[['pnpm','test','--runInBand'],['pnpm','test:e2e','--runInBand'],['pnpm','lint']],build:[['pnpm','build']],dev:['pnpm','start:dev']},
  techcanvas: {directory:'apps/techcanvas',install:[],check:[['npm','run','check'],['npm','test'],['npm','run','infra:test']],build:[['npm','--prefix','infra','run','build']],dev:['npm','run','dev']}
};
export function parseTarget(args) {
  const options=args.filter(a=>a!=='--');
  let target='all';
  if(options[0]==='--target'){target=options[1];if(options.length!==2)throw new Error('Use --target portfolio|api|techcanvas|all');}
  else if(options.length===1)target=options[0];
  else if(options.length)throw new Error('Use --target portfolio|api|techcanvas|all');
  if(target!=='all'&&!targets.includes(target))throw new Error('Unknown target: '+target);
  return target;
}
export function affectedTargets(paths) {
  const affected=new Set();
  for(const path of paths){
    if(path.startsWith('apps/portfolio/'))affected.add('portfolio');
    else if(path.startsWith('apps/api/'))affected.add('api');
    else if(path.startsWith('apps/techcanvas/'))affected.add('techcanvas');
    else if(path.startsWith('infra/')){affected.add('portfolio');affected.add('api');}
    else if(path.startsWith('scripts/')||path.startsWith('ci/')||path==='.gitignore'||path==='package.json')for(const target of targets)affected.add(target);
  }
  return targets.filter(t=>affected.has(t));
}
