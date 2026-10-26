import { readFileSync } from 'node:fs';
const template = JSON.parse(readFileSync(new URL('../cdk.out/TechCanvasFoundation.template.json', import.meta.url)));
const counts = {};
for (const r of Object.values(template.Resources)) counts[r.Type] = (counts[r.Type] || 0) + 1;
console.log(JSON.stringify({ region: 'ap-southeast-2', scope: 'locally synthesized template', deploymentStatus: 'Not queried; this command inspects a local template only.', resourceCount: Object.values(counts).reduce((a,b) => a+b,0), resources: counts, retained: Object.entries(template.Resources).filter(([,r]) => r.DeletionPolicy === 'Retain').map(([id]) => id) }, null, 2));
