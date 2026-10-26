// Offline dry run by default. Applying requires an approved target table and --apply.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const input=process.argv[2];
if(!input)throw new Error('Usage: node scripts/migrate-blogs.mjs /private/posts-export.json [--apply]');
const data=JSON.parse(await readFile(input,'utf8')),rows=Array.isArray(data)?data:data.posts;
if(!Array.isArray(rows))throw new Error('Expected an array of posts or an object with posts.');
const ids=new Set(),slugs=new Set();let externalCovers=0;
const blogs=rows.map(row=>{
 if(!row || typeof row!=='object')throw new Error('Invalid post record');
 if(typeof row.id!=='string' || !/^[0-9a-f-]{36}$/i.test(row.id))throw new Error('Invalid post identity');
 if(typeof row.title!=='string' || !row.title.trim() || row.title.length>160 || typeof row.content_markdown!=='string' || !row.content_markdown.trim() || row.content_markdown.length>200000)throw new Error('Post content is missing or too large');
 if(typeof row.slug!=='string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug) || !['draft','published'].includes(row.status))throw new Error('Invalid slug or publication status');
 if(ids.has(row.id)||slugs.has(row.slug))throw new Error('Duplicate identities or slugs in export');ids.add(row.id);slugs.add(row.slug);
 if(row.summary!==null && row.summary!==undefined && (typeof row.summary!=='string'||row.summary.length>1800))throw new Error('Invalid summary');
 if(!Array.isArray(row.tags)||row.tags.length>12||row.tags.some(t=>typeof t!=='string'||t.length>40))throw new Error('Invalid tags');
 if(row.cover_image){const url=new URL(row.cover_image);if(url.protocol!=='https:')throw new Error('Cover images require HTTPS');externalCovers++;}
 const blog={id:row.id,title:row.title,slug:row.slug,summary:row.summary||null,content_markdown:row.content_markdown,cover_image:row.cover_image||null,tags:row.tags,status:row.status,published_at:row.published_at?new Date(row.published_at).toISOString():null,created_at:new Date(row.created_at).toISOString(),updated_at:new Date(row.updated_at).toISOString()};
 if(Buffer.byteLength(JSON.stringify(blog))>350000)throw new Error('Post exceeds DynamoDB record safety limit');
 return blog;
});
console.log(JSON.stringify({mode:process.argv.includes('--apply')?'apply':'offline dry run',posts:blogs.length,published:blogs.filter(p=>p.status==='published').length,drafts:blogs.filter(p=>p.status==='draft').length,coverReferencesRequiringReview:externalCovers,region:'ap-southeast-2'},null,2));
if(process.argv.includes('--apply')){
 if(!process.env.BLOG_TABLE_NAME)throw new Error('Set the explicitly approved BLOG_TABLE_NAME.');
 if(process.env.AWS_REGION && process.env.AWS_REGION!=='ap-southeast-2')throw new Error('Only Sydney is supported.');
 if(externalCovers && !process.argv.includes('--allow-external-covers'))throw new Error('Review and migrate cover assets before an all-AWS cutover, or explicitly allow retained external cover URLs.');
 const require=createRequire(import.meta.url),{DynamoBlogsRepository}=require('../dist/blogs/dynamo-blogs.repository.js');
 const repo=new DynamoBlogsRepository(process.env.BLOG_TABLE_NAME);let created=0;
 for(const blog of blogs)if((await repo.importPost(blog)).created)created++;
 console.log(JSON.stringify({created,alreadyMatched:blogs.length-created,overwrites:0,sourceModified:false}));
}
