import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAnalyzeRequest, handleRequest } from '../worker/src/index.js';
import { DAILY_ANALYSIS_LIMIT, MAX_INPUT_CHARS } from '../worker/src/config.js';
import { anonymousDailyKey } from '../worker/src/rate-limit.js';

function makeUsageStore(initial=0){
  let count=initial;
  return {
    async getUsage(){ return count; },
    async setUsage(_key,_day,next){ count=next; },
    get count(){ return count; }
  };
}

test('validateAnalyzeRequest rejects empty, non-string, and oversized input', () => {
  assert.throws(()=>validateAnalyzeRequest({text:'   '}), e=>e.status===400);
  assert.throws(()=>validateAnalyzeRequest({text:42}), e=>e.status===400);
  assert.throws(()=>validateAnalyzeRequest({text:'x'.repeat(MAX_INPUT_CHARS+1)}), e=>e.status===413);
  assert.equal(validateAnalyzeRequest({text:'hello'}).sourceText, 'hello');
});

test('rejected analyze requests never call analyzer', async () => {
  let calls=0;
  const req=new Request('https://example.test/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'  '})});
  const res=await handleRequest(req, {}, {analyze:async(_env,_text,{beforeCreate})=>{await beforeCreate();calls++;return {ok:true};}, usageStore:makeUsageStore()});
  assert.equal(res.status,400);
  assert.equal(calls,0);
});

test('sixth new analysis in a day is rate limited before analyzer call', async () => {
  let calls=0;
  const store=makeUsageStore(DAILY_ANALYSIS_LIMIT);
  const req=new Request('https://example.test/api/analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({text:'hello'})});
  const res=await handleRequest(req, {}, {analyze:async(_env,_text,{beforeCreate})=>{await beforeCreate();calls++;return {ok:true};}, usageStore:store, now:()=>new Date('2026-10-06T00:00:00Z')});
  assert.equal(res.status,429);
  assert.equal(calls,0);
});

test('health endpoint responds without analysis', async()=>{
  const res=await handleRequest(new Request('https://example.test/api/health'),{},{});
  assert.equal(res.status,200);
  assert.deepEqual(await res.json(),{ok:true,service:'mingmaben-ai'});
});


test('anonymous daily key is stable across user-agent changes on the same network', async()=>{
  const day='2026-10-06';
  const a=new Request('https://example.test/',{headers:{'cf-connecting-ip':'203.0.113.7','user-agent':'Browser A'}});
  const b=new Request('https://example.test/',{headers:{'cf-connecting-ip':'203.0.113.7','user-agent':'Browser B'}});
  assert.equal(await anonymousDailyKey(a,day),await anonymousDailyKey(b,day));
});
