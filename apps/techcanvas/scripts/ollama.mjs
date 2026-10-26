import {spawn} from 'node:child_process';
import {mkdir,access} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DEFAULT_MODEL,inspectOllama,validateLocalModel} from '../ollama-provider.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const model=validateLocalModel(process.env.OLLAMA_MODEL||DEFAULT_MODEL);
const command=process.argv[2];
if(!['serve','pull','check'].includes(command))throw new Error('Usage: node scripts/ollama.mjs serve|pull|check');
if(command==='check'){
  const result=await inspectOllama(model);console.log(result.ready?`Local AI ready: ${model}`:result.error);process.exitCode=result.ready?0:1;
}else{
  let binary=process.env.OLLAMA_BIN||'ollama';
  // Homebrew may not be on PATH in the app's terminal environment.
  if(binary==='ollama')for(const candidate of ['/opt/homebrew/bin/ollama','/usr/local/bin/ollama']){try{await access(candidate);binary=candidate;break;}catch{}}
  const models=join(resolve(root,process.env.DATA_DIR||'data'),'ollama','models');
  await mkdir(models,{recursive:true});
  if(command==='pull')console.log(`Downloading local model ${model}; no cloud account or paid API is used.`);
  else console.log(`Local-only Ollama at 127.0.0.1:11434. Models: ${models}. Stop with Ctrl+C.`);
  const child=spawn(binary,command==='serve'?['serve']:['pull',model],{cwd:root,stdio:'inherit',env:{...process.env,
    OLLAMA_HOST:'127.0.0.1:11434',OLLAMA_NO_CLOUD:'1',OLLAMA_MODELS:models,
    OLLAMA_NUM_PARALLEL:'1',OLLAMA_MAX_LOADED_MODELS:'1',OLLAMA_CONTEXT_LENGTH:'4096',OLLAMA_KEEP_ALIVE:'2m',OLLAMA_KV_CACHE_TYPE:'q8_0'}});
  child.on('error',()=>{console.error('Ollama CLI not found. Install it first (macOS: brew install ollama).');process.exitCode=1;});
  child.on('exit',(code,signal)=>{process.exitCode=signal?0:code??1;});
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>child.kill(signal));
}
