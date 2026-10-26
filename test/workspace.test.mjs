import test from 'node:test';import assert from 'node:assert/strict';
import {affectedTargets,parseTarget,targets} from '../scripts/workspace-config.mjs';
import {execFileSync} from 'node:child_process';
test('one web application and one worker are the active targets',()=>{assert.deepEqual(targets,['portfolio','worker']);assert.deepEqual(affectedTargets(['apps/api/src/main.ts']),['portfolio']);assert.deepEqual(affectedTargets(['apps/portfolio/lib/studio/content.mjs']),['portfolio','worker']);assert.deepEqual(affectedTargets(['apps/worker/internal/engine/worker.go']),['portfolio','worker']);assert.deepEqual(affectedTargets(['docs/test.md']),[]);});
test('retired app targets and deployment-like flags are rejected',()=>{for(const target of ['api','techcanvas','--apply'])assert.throws(()=>parseTarget([target]));});
test('release plan blocks the previous code-only deployment during migration',()=>{const p=JSON.parse(execFileSync(process.execPath,['scripts/release-plan.mjs'],{encoding:'utf8'}));assert.equal(p.mode,'plan-only');assert.equal(p.blockedForProduction,true);assert.deepEqual(p.releases,[]);});
