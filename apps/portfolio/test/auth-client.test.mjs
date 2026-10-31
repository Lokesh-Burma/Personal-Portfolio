import test from 'node:test';
import assert from 'node:assert/strict';
import {readJSONResponse,readOwnerSession} from '../lib/auth/client.ts';

test('HTML and invalid JSON errors never leak parser output or become authenticated sessions',async()=>{
 for(const response of [new Response('<!DOCTYPE html><h1>Unavailable</h1>',{status:503,headers:{'content-type':'text/html'}}),new Response('broken',{headers:{'content-type':'application/json'}}),Response.json(null)]){
  await assert.rejects(readJSONResponse(response),error=>error.message==='The workspace is temporarily unavailable. Please retry.');
 }
});
test('JSON failures preserve the server message and valid session reads are uncached GETs',async t=>{
 await assert.rejects(readJSONResponse(Response.json({error:'Unauthorized'},{status:401})),/Unauthorized/);
 const calls=[];t.mock.method(globalThis,'fetch',async(url,init)=>{calls.push({url,init});return Response.json({authenticated:false,authMode:'cognito'});});
 assert.equal((await readOwnerSession()).authenticated,false);assert.equal(calls.length,1);assert.equal(calls[0].url,'/api/admin/session');assert.equal(calls[0].init.cache,'no-store');assert.equal(calls[0].init.method,undefined);
});
test('malformed session shape is rejected without retries',async t=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return Response.json({authenticated:'yes'});});
 await assert.rejects(readOwnerSession(),/temporarily unavailable/);assert.equal(calls,1);
});
