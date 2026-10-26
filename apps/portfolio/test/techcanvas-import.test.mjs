import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTechCanvasDraft, MAX_TECHCANVAS_IMPORT_BYTES } from '../lib/techcanvas-import.ts';
const pack = { title:'Cache Aside',summary:'Check, fill, invalidate.',content_markdown:'# Cache Aside\n\nReview this explanation.',tags:['techcanvas'],status:'draft' };
test('imports the existing TechCanvas export contract as an editable draft',()=>{
 const parsed=parseTechCanvasDraft(JSON.stringify(pack));
 assert.equal(parsed.title,pack.title);assert.equal(parsed.slug,'cache-aside');assert.equal(parsed.content_markdown,pack.content_markdown);assert.equal(parsed.status,'draft');assert.equal(parsed.tags,'techcanvas');
});
test('cannot import published state, existing identities, or expiring private cover links',()=>{
 const parsed=parseTechCanvasDraft(JSON.stringify({...pack,id:'existing',slug:'override',status:'published',published_at:'2026-01-01',cover_image:'https://example.s3.amazonaws.com/private?signature=x'}));
 assert.equal(parsed.status,'draft');assert.equal(parsed.cover_image,'');assert.equal(parsed.slug,'cache-aside');assert.ok(!Object.hasOwn(parsed,'id'));assert.ok(!Object.hasOwn(parsed,'published_at'));
});
test('rejects malformed and oversized exports including UTF-8 byte overflow',()=>{
 for(const value of ['{','null','[]','{}',JSON.stringify({...pack,title:42}),JSON.stringify({...pack,content_markdown:''}),JSON.stringify({...pack,tags:'tag'}),JSON.stringify({...pack,tags:['a,b']})]) assert.throws(()=>parseTechCanvasDraft(value));
 assert.throws(()=>parseTechCanvasDraft(' '.repeat(MAX_TECHCANVAS_IMPORT_BYTES+1)),/256 KB/);
 assert.throws(()=>parseTechCanvasDraft(JSON.stringify({...pack,content_markdown:'漢'.repeat(90_000)})),/256 KB/);
});
test('keeps imported markup as editor text and ignores prototype properties',()=>{
 const raw=JSON.stringify({...pack,content_markdown:'<script>alert(1)</script>'}).replace(/}$/,',"__proto__":{"polluted":true}}');
 const parsed=parseTechCanvasDraft(raw);assert.equal(parsed.content_markdown,'<script>alert(1)</script>');assert.equal({}.polluted,undefined);assert.ok(!Object.hasOwn(parsed,'__proto__'));
});
