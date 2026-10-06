import test from 'node:test';
import assert from 'node:assert/strict';
import { getOrCreateReading } from '../worker/src/readings.js';

class MemoryReadingStore {
  constructor(){ this.readings=new Map(); this.claims=new Set(); }
  async getByHash(hash){ return this.readings.get(hash) || null; }
  async tryClaim(hash){ if(this.claims.has(hash)) return false; this.claims.add(hash); return true; }
  async releaseClaim(hash){ this.claims.delete(hash); }
  async insertReading(record){ if(!this.readings.has(record.request_hash)) this.readings.set(record.request_hash,structuredClone(record)); }
}

const reading={
  language_detected:'en', surface_meaning_en:'surface', surface_meaning_zh:'表面',
  canonical_reading_en:'one frozen reading', canonical_reading_zh:'唯一冻结显影',
  whole_form_mechanism_en:'whole mechanism', whole_form_mechanism_zh:'整体机制',
  structural_evidence:['parallel structure'], layer0_relevance:[],
  incremental_information_en:'increment', incremental_information_zh:'增量',
  uncertainties_en:'none', uncertainties_zh:'无',
  structural_evidence_strength:'moderate', later_outcome_confirmation:'not_evaluated',
  reality_boundary_en:'experimental only', reality_boundary_zh:'仅实验'
};

function requester(counter,delay=0){
  return async()=>{
    counter.count++;
    if(delay) await new Promise(r=>setTimeout(r,delay));
    return {reading:structuredClone(reading),responseId:`resp-${counter.count}`};
  };
}

test('first reading freezes; duplicate returns same frozen result without another model call',async()=>{
  const store=new MemoryReadingStore(); const counter={count:0};
  const deps={store,requester:requester(counter),now:()=>new Date('2026-10-06T00:00:00Z'),sleep:async()=>{}};
  const a=await getOrCreateReading({OPENAI_API_KEY:'x'},'same text',deps);
  const b=await getOrCreateReading({OPENAI_API_KEY:'x'},'same text',deps);
  assert.equal(counter.count,1);
  assert.equal(a.frozen_id,b.frozen_id);
  assert.deepEqual(a.result,b.result);
  assert.equal(a.cached,false);
  assert.equal(b.cached,true);
});

test('concurrent identical submissions converge on one model call and one frozen result',async()=>{
  const store=new MemoryReadingStore(); const counter={count:0};
  const deps={store,requester:requester(counter,20),now:()=>new Date('2026-10-06T00:00:00Z'),sleep:()=>new Promise(r=>setTimeout(r,5)),pollAttempts:20};
  const [a,b]=await Promise.all([
    getOrCreateReading({OPENAI_API_KEY:'x'},'concurrent text',deps),
    getOrCreateReading({OPENAI_API_KEY:'x'},'concurrent text',deps)
  ]);
  assert.equal(counter.count,1);
  assert.equal(a.frozen_id,b.frozen_id);
  assert.deepEqual(a.result,b.result);
});

test('failed model output is never frozen and claim is released',async()=>{
  const store=new MemoryReadingStore(); let attempts=0;
  const deps={store,requester:async()=>{attempts++;throw new Error('schema failure');},now:()=>new Date('2026-10-06T00:00:00Z'),sleep:async()=>{}};
  await assert.rejects(()=>getOrCreateReading({OPENAI_API_KEY:'x'},'bad',deps),/schema failure/);
  assert.equal(store.readings.size,0);
  assert.equal(store.claims.size,0);
  assert.equal(attempts,1);
});

test('quota guard runs only for a new canonical analysis, not cache hits',async()=>{
  const store=new MemoryReadingStore(); const counter={count:0}; let quotaCalls=0;
  const deps={store,requester:requester(counter),beforeCreate:async()=>{quotaCalls++;},now:()=>new Date('2026-10-06T00:00:00Z'),sleep:async()=>{}};
  await getOrCreateReading({OPENAI_API_KEY:'x'},'cached text',deps);
  await getOrCreateReading({OPENAI_API_KEY:'x'},'cached text',deps);
  assert.equal(quotaCalls,1);
});
