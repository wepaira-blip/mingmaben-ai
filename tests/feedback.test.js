import test from 'node:test';
import assert from 'node:assert/strict';
import { saveFeedback } from '../worker/src/feedback.js';

class MemoryFeedbackStore {
  constructor(){ this.readings=new Map(); this.feedback=[]; }
  async hasReading(id){ return this.readings.has(id); }
  async insertFeedback(row){ this.feedback.push(structuredClone(row)); }
}

test('valid feedback stores rating for existing Frozen ID without mutating reading',async()=>{
  const store=new MemoryFeedbackStore();
  const original={result:{canonical_reading_en:'fixed'}};
  store.readings.set('MM-AI-abc',structuredClone(original));
  const before=JSON.stringify(store.readings.get('MM-AI-abc'));
  const saved=await saveFeedback(store,'MM-AI-abc','correct',()=>new Date('2026-10-06T01:00:00Z'));
  assert.equal(saved.rating,'correct');
  assert.equal(store.feedback.length,1);
  assert.equal(JSON.stringify(store.readings.get('MM-AI-abc')),before);
});

test('invalid rating is rejected',async()=>{
  const store=new MemoryFeedbackStore();
  store.readings.set('MM-AI-abc',{});
  await assert.rejects(()=>saveFeedback(store,'MM-AI-abc','excellent'),e=>e.status===400);
});

test('unknown Frozen ID is rejected',async()=>{
  const store=new MemoryFeedbackStore();
  await assert.rejects(()=>saveFeedback(store,'MM-AI-missing','partial'),e=>e.status===404);
});
