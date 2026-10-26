import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMarkdownImage} from '../lib/markdown-image.ts';
test('recognizes authored image blocks with HTTPS or same-site paths',()=>{
 assert.deepEqual(parseMarkdownImage('![System architecture](https://lokeshburma.com/images/blog/design.png)'),{alt:'System architecture',src:'https://lokeshburma.com/images/blog/design.png'});
 assert.deepEqual(parseMarkdownImage('![](/images/design.png)'),{alt:'',src:'/images/design.png'});
});
test('rejects script, data, protocol-relative and credential-bearing image destinations',()=>{
 for(const src of ['javascript:alert(1)','data:image/png;base64,AA','//example.com/a.png','/\\example.com/a.png','https://user:secret@example.com/a.png'])assert.equal(parseMarkdownImage(`![image](${src})`),null);
 assert.equal(parseMarkdownImage('Text before ![image](/image.png)'),null);
});
