import { HttpError,topicInput } from './service.mjs';
export function generationControls(env=process.env) {
  const ready=env.TECHCANVAS_JOB_CREATION_APPROVED==='true' && env.BEDROCK_USAGE_APPROVED==='true';
  return {ready,imageGeneration:ready && env.TECHCANVAS_IMAGE_CREATION_APPROVED==='true'};
}
export function cloudJobInput(input,controls) {
  if(!controls.ready)throw new HttpError(503,'Generation awaits activation approval. No paid call was made.');
  if(!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).some(k=>!['topic','generateImage'].includes(k)) || (input.generateImage!==undefined && typeof input.generateImage!=='boolean'))throw new HttpError(400,'Expected a topic and optional image selection.');
  if(input.generateImage && !controls.imageGeneration)throw new HttpError(503,'Image generation awaits separate activation approval.');
  return {topic:topicInput(input.topic),generateImage:input.generateImage===true};
}
export function cloudRetryInput(input,controls) {
  if(!controls.ready)throw new HttpError(503,'Generation awaits activation approval. No paid call was made.');
  if(!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).length)throw new HttpError(400,'Expected an empty object.');
}
