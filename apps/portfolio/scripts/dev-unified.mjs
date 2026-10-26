import {access,mkdir,writeFile,readFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {parseEnv} from 'node:util';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {hashAdminPassword} from '../lib/session.ts';
const root=fileURLToPath(new URL('../',import.meta.url)),envPath=join(root,'.env.unified.local'),data=join(root,'.local-platform');
try{await access(envPath);}catch{await mkdir(data,{recursive:true,mode:0o700});const password=randomBytes(24).toString('base64url');await writeFile(join(data,'local-login.txt'),'Local development only\nEmail: owner@example.test\nPassword: '+password+'\n',{mode:0o600});await writeFile(envPath,['PLATFORM_LOCAL_DEMO=true','PLATFORM_DATA_DIR='+JSON.stringify(data),'ADMIN_EMAIL=owner@example.test','ADMIN_PASSWORD_HASH='+hashAdminPassword(password),'ADMIN_SESSION_SECRET='+randomBytes(48).toString('base64url'),'SITE_ORIGIN=http://127.0.0.1:3000'].join('\n')+'\n',{mode:0o600});}
console.log('Local-only common app. Owner login details: '+join(data,'local-login.txt')+' (private; not committed).');
if(!process.argv.includes('--setup-only')){
 const env={...process.env,...parseEnv(await readFile(envPath,'utf8')),NODE_ENV:'development'};delete env.AWS_EXECUTION_ENV;delete env.AWS_LAMBDA_HTTP_ENDPOINT;
 const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3000'],{cwd:root,env,stdio:'inherit'});
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>child.kill(signal));child.once('exit',code=>process.exit(code || 0));
}
