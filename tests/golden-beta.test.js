import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getOrCreateReading } from '../worker/src/readings.js';
import { validateModelReading } from '../worker/src/schema.js';
import { MINGMABEN_SYSTEM_PROMPT } from '../worker/src/prompt.js';

const fixturePath = path.resolve('tests/fixtures/beta-v1.json');
const fixtures = JSON.parse(fs.readFileSync(fixturePath,'utf8'));

class MemoryReadingStore {
  constructor(){ this.readings=new Map(); this.claims=new Set(); }
  async getByHash(hash){ return this.readings.get(hash) || null; }
  async tryClaim(hash){ if(this.claims.has(hash)) return false; this.claims.add(hash); return true; }
  async releaseClaim(hash){ this.claims.delete(hash); }
  async insertReading(record){ if(!this.readings.has(record.request_hash)) this.readings.set(record.request_hash,structuredClone(record)); }
}

function sampleReading(source){
  return validateModelReading({
    language_detected:/[\u3400-\u9fff]/.test(source)?'zh':'en',
    surface_meaning_en:'Independent surface paraphrase.',
    surface_meaning_zh:'独立表面释义。',
    canonical_reading_en:'No stable whole-form mechanism emerged.',
    canonical_reading_zh:'尚未形成稳定整体机制。',
    whole_form_mechanism_en:'No mechanism is forced when evidence is insufficient.',
    whole_form_mechanism_zh:'证据不足时不强行生成整体机制。',
    structural_evidence:[],
    layer0_relevance:[],
    incremental_information_en:'No additional claim is forced.',
    incremental_information_zh:'不强行制造额外结论。',
    uncertainties_en:'High uncertainty.',
    uncertainties_zh:'不确定性高。',
    structural_evidence_strength:'open',
    later_outcome_confirmation:'not_evaluated',
    reality_boundary_en:'Experimental symbolic/structural reading only.',
    reality_boundary_zh:'仅为实验性符号/结构解译。'
  });
}

test('beta fixture set includes known-reality, false-claim, Chinese, and low-signal cases',()=>{
  assert.ok(fixtures.some(x=>x.id==='geometry-known-reality'));
  assert.ok(fixtures.some(x=>x.id==='astronomy-known-reality'));
  assert.ok(fixtures.some(x=>x.id==='false-water-bottle'));
  assert.ok(fixtures.some(x=>x.id==='relationship-space-zh'));
  assert.ok(fixtures.some(x=>x.id==='low-signal'));
});

test('golden fixtures pin method discipline rather than forcing agreement with reality',async()=>{
  assert.match(MINGMABEN_SYSTEM_PROMPT,/surface meaning is independent comparison material/i);
  assert.match(MINGMABEN_SYSTEM_PROMPT,/never rescue a weak case/i);
  assert.match(MINGMABEN_SYSTEM_PROMPT,/later reality or a known outcome is NOT part of the initial decoding/i);

  for(const fixture of fixtures){
    const store=new MemoryReadingStore();
    let calls=0;
    const deps={
      store,
      requester:async()=>{calls++;return {reading:sampleReading(fixture.text),responseId:`resp-${fixture.id}`};},
      now:()=>new Date('2026-10-06T00:00:00Z'),
      sleep:async()=>{}
    };
    const first=await getOrCreateReading({OPENAI_API_KEY:'x'},fixture.text,deps);
    const second=await getOrCreateReading({OPENAI_API_KEY:'x'},fixture.text,deps);
    assert.equal(first.frozen_id,second.frozen_id,fixture.id);
    assert.deepEqual(first.result,second.result,fixture.id);
    assert.equal(calls,1,fixture.id);
    assert.equal(first.result.later_outcome_confirmation,'not_evaluated',fixture.id);
  }
});
