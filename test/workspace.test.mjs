import test from 'node:test';import assert from 'node:assert/strict';
import {affectedTargets,parseTarget,targets} from '../scripts/workspace-config.mjs';
import {execFileSync} from 'node:child_process';
test('one web application and one worker are the active targets',()=>{assert.deepEqual(targets,['portfolio','worker']);assert.deepEqual(affectedTargets(['apps/api/src/main.ts']),['portfolio']);assert.deepEqual(affectedTargets(['apps/portfolio/lib/studio/content.mjs']),['portfolio','worker']);assert.deepEqual(affectedTargets(['apps/worker/internal/engine/worker.go']),['portfolio','worker']);assert.deepEqual(affectedTargets(['docs/test.md']),[]);});
test('previous API and studio target names resolve to the common app',()=>{assert.equal(parseTarget(['--target','api']),'portfolio');assert.equal(parseTarget(['techcanvas']),'portfolio');assert.throws(()=>parseTarget(['--apply']));});
test('release plan blocks the previous code-only deployment during migration',()=>{const p=JSON.parse(execFileSync(process.execPath,['scripts/release-plan.mjs'],{encoding:'utf8'}));assert.equal(p.mode,'plan-only');assert.equal(p.blockedForProduction,true);assert.deepEqual(p.releases,[]);});
