import test from 'node:test';
import assert from 'node:assert/strict';
import { READING_SCHEMA, validateModelReading } from '../worker/src/schema.js';

const valid = {
  language_detected:'en',
  surface_meaning_en:'surface', surface_meaning_zh:'表面',
  canonical_reading_en:'reading', canonical_reading_zh:'显影',
  whole_form_mechanism_en:'mechanism', whole_form_mechanism_zh:'机制',
  structural_evidence:['parallel relation'],
  layer0_relevance:[{code:'A',relevance_en:'group/collective love',relevance_zh:'群体性 / 大爱',relation_to_whole_en:'supports frame',relation_to_whole_zh:'支持框架'}],
  incremental_information_en:'increment', incremental_information_zh:'增量',
  uncertainties_en:'none', uncertainties_zh:'无',
  structural_evidence_strength:'moderate',
  later_outcome_confirmation:'not_evaluated',
  reality_boundary_en:'experimental only', reality_boundary_zh:'仅实验'
};

test('reading schema is strict and contains all frozen result fields',()=>{
  assert.equal(READING_SCHEMA.type,'object');
  assert.equal(READING_SCHEMA.additionalProperties,false);
  assert.deepEqual(new Set(READING_SCHEMA.required),new Set(Object.keys(valid)));
});

test('valid reading passes and malformed reading is rejected',()=>{
  assert.deepEqual(validateModelReading(structuredClone(valid)),valid);
  const missing=structuredClone(valid); delete missing.canonical_reading_en;
  assert.throws(()=>validateModelReading(missing),/canonical_reading_en/);
  const wrong=structuredClone(valid); wrong.structural_evidence_strength='certain';
  assert.throws(()=>validateModelReading(wrong),/structural_evidence_strength/);
  const later=structuredClone(valid); later.later_outcome_confirmation='high';
  assert.throws(()=>validateModelReading(later),/later_outcome_confirmation/);
});
