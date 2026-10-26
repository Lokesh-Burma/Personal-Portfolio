import {readFile,writeFile} from 'node:fs/promises';
import {catalog} from '../apps/techcanvas/content.mjs';
import {referenceFor} from '../apps/techcanvas/reference-notes.mjs';
const references=Object.fromEntries(['database indexing','circuit breakers','consistent hashing'].map(topic=>[topic,referenceFor(topic)]));
const path=new URL('../apps/worker/internal/engine/data.json',import.meta.url),data=JSON.stringify({catalog,references},null,2)+'\n';
if(process.argv.includes('--check')){if(await readFile(path,'utf8')!==data)throw new Error('Go worker data is stale; run node scripts/sync-worker-data.mjs');console.log('Worker grounding/demo data matches TechCanvas.');}
else await writeFile(path,data);
