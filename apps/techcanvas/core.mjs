import { requestLocalContent } from './ollama-provider.mjs';
import { renderMemorySvg } from './memory.mjs';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { catalog, validateContent, renderSvg, markdown, assetNames } from './content.mjs';
export { catalog, renderSvg, markdown, assetNames } from './content.mjs';

export async function generate(topic, provider, model, fetcher = fetch) {
  if (provider === 'demo') {
    if (!Object.hasOwn(catalog,topic)) throw new Error('Demo mode supports the three example topics. Use local Ollama for a custom topic.');
    return structuredClone(catalog[topic]);
  }
  if (provider !== 'ollama') throw new Error('Unsupported content provider. Paid providers are disabled.');
  return validateContent(await requestLocalContent(topic,model,fetcher));
}
export class Store {
  constructor(directory) { this.directory = directory; }
  async init() {
    await mkdir(this.directory,{recursive:true});
    this.db = new DatabaseSync(join(this.directory,'techcanvas.sqlite'));
    this.db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, topic TEXT NOT NULL, provider TEXT NOT NULL, status TEXT NOT NULL, created TEXT NOT NULL, content TEXT, error TEXT, request_key TEXT UNIQUE, fingerprint TEXT NOT NULL);`);
    this.db.exec("UPDATE jobs SET status='failed', error='Generation interrupted by restart. Retry the job.' WHERE status IN ('queued','running')");
    return this;
  }
  get(id) { const row=this.db.prepare('SELECT * FROM jobs WHERE id=?').get(id); if (!row) return null; const {request_key,fingerprint,...job}=row; return {...job,content:job.content?JSON.parse(job.content):null}; }
  list() { return this.db.prepare('SELECT id,topic,provider,status,created,error FROM jobs ORDER BY created DESC LIMIT 100').all(); }
  create(topic,provider,key=null) {
    const fp=createHash('sha256').update(JSON.stringify({topic,provider})).digest('hex');
    if(key) { const existing=this.db.prepare('SELECT id,fingerprint FROM jobs WHERE request_key=?').get(key); if(existing) { if(existing.fingerprint!==fp) throw Object.assign(new Error('Idempotency key was already used for different input.'),{status:409}); return {job:this.get(existing.id),fresh:false}; } }
    if(this.db.prepare("SELECT count(*) AS n FROM jobs WHERE status IN ('queued','running')").get().n>=5) throw Object.assign(new Error('Generation queue is full. Please wait.'),{status:429});
    const id=randomUUID();
    this.db.prepare('INSERT INTO jobs (id,topic,provider,status,created,request_key,fingerprint) VALUES (?,?,?,?,?,?,?)').run(id,topic,provider,'queued',new Date().toISOString(),key,fp);
    return {job:this.get(id),fresh:true};
  }
  async run(id, model, generator=generate) {
    const job=this.get(id); if(!job || job.status!=='queued') return;
    this.db.prepare("UPDATE jobs SET status='running', error=NULL WHERE id=?").run(id);
    const directory=join(this.directory,id);
    try {
      const c=validateContent(await generator(job.topic,job.provider,model));
      await mkdir(directory,{recursive:true});
      const assets = {'blog.md':markdown(job.topic,c),'summary.svg':renderSvg(job.topic,c,null,job.provider),'memory.svg':renderMemorySvg(job.topic,c,job.provider),
        'portfolio.json':JSON.stringify({title:job.topic,summary:c.paragraph,content_markdown:markdown(job.topic,c),tags:['techcanvas'],status:'draft'},null,2),
        'caption.txt':`${c.sentence}\n\n${c.paragraph}\n\n#SoftwareEngineering #TechCanvas`};
      c.concepts.forEach((_,i)=>{assets[`concept-${i+1}.svg`]=renderSvg(job.topic,c,i,job.provider);});
      for(const [file,body] of Object.entries(assets)) { const target=join(directory,file); await writeFile(target+'.tmp',body); await rename(target+'.tmp',target); }
      this.db.prepare("UPDATE jobs SET status='completed',content=? WHERE id=?").run(JSON.stringify(c),id);
    } catch(error) {
      await rm(directory,{recursive:true,force:true});
      this.db.prepare("UPDATE jobs SET status='failed',error=? WHERE id=?").run(error.name==='TimeoutError'?'Local model timed out. Try a smaller model.': String(error.message).slice(0,400),id);
    }
  }
  async asset(id,name) {
    const target=join(this.directory,id,name);
    try { return await readFile(target); }
    catch(error) {
      // Old saved packs receive the new visual without regenerating their content.
      if(error.code!=='ENOENT' || name!=='memory.svg') throw error;
      const job=this.get(id);
      if(job?.status!=='completed' || !job.content) throw error;
      const body=renderMemorySvg(job.topic,job.content,job.provider);
      const temporary=target+'.'+randomUUID()+'.tmp';
      await writeFile(temporary,body); await rename(temporary,target);
      return Buffer.from(body);
    }
  }
  close() { this.db.close(); }
}
export async function uploadToS3(store,id,env=process.env,execute=promisify(execFile)) {
  if(env.S3_UPLOAD_APPROVED!=='true') throw new Error('S3 uploads are disabled pending your approval.');
  if(!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(env.S3_BUCKET||'') || !/^[a-z]{2}-[a-z]+-\d$/.test(env.AWS_REGION||'')) throw new Error('Configure a valid S3 bucket and AWS region.');
  if(store.get(id)?.status!=='completed') throw new Error('Only completed jobs can be uploaded.');
  // Sequential writes; private bucket only. No bucket creation or ACL changes.
  for(const name of assetNames) {
    await store.asset(id,name);
    await execute('aws',['s3','cp',join(store.directory,id,name),`s3://${env.S3_BUCKET}/techcanvas/${id}/${name}`,'--region',env.AWS_REGION,'--only-show-errors'],{timeout:30000});
  }
  return {prefix:`s3://${env.S3_BUCKET}/techcanvas/${id}/`};
}
