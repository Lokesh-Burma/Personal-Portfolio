import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {THEME_INIT_SCRIPT} from '../lib/theme.ts';

test('saved light/dark theme is applied before rendering; invalid or blocked storage follows system',()=>{
 for(const saved of ['light','dark',null,'system','invalid']){
  const document={documentElement:{dataset:{}}};
  runInNewContext(THEME_INIT_SCRIPT,{document,localStorage:{getItem:()=>saved}});
  assert.equal(document.documentElement.dataset.theme,['light','dark'].includes(saved)?saved:undefined);
 }
 const document={documentElement:{dataset:{}}};
 assert.doesNotThrow(()=>runInNewContext(THEME_INIT_SCRIPT,{document,localStorage:{getItem:()=>{throw Error('Storage blocked')}}}));
 assert.equal(document.documentElement.dataset.theme,undefined);
});
