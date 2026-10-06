import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chooseView, requestAnalysis } from '../web/app.js';

const html=()=>fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');

test('text-only page exposes one analysis flow and English result before Chinese',()=>{
  const s=html();
  assert.match(s,/<textarea[^>]+id="source"/);
  assert.match(s,/id="analyze"/);
  assert.match(s,/value="reading"/);
  assert.match(s,/value="evidence"/);
  assert.match(s,/id="frozen-id"/);
  assert.ok(s.indexOf('id="result-en"') < s.indexOf('id="result-zh"'));
  assert.match(s,/data-feedback="correct"/);
  assert.match(s,/data-feedback="partial"/);
  assert.match(s,/data-feedback="wrong"/);
  assert.match(s,/id="support-card"/);
  assert.doesNotMatch(s,/type="file"/i);
  assert.doesNotMatch(s,/voice|microphone|OCR/i);
  assert.doesNotMatch(s,/OPENAI_API_KEY|sk-[A-Za-z0-9_-]+/);
});

test('Reading and Evidence are local views of the exact same frozen bundle',()=>{
  const bundle={frozen_id:'MM-AI-1',result:{canonical_reading_en:'fixed'}};
  const reading=chooseView(bundle,'reading');
  const evidence=chooseView(bundle,'evidence');
  assert.equal(reading.bundle,bundle);
  assert.equal(evidence.bundle,bundle);
  assert.equal(reading.showEvidence,false);
  assert.equal(evidence.showEvidence,true);
});

test('analysis request makes exactly one backend call and surfaces backend errors',async()=>{
  let calls=0;
  const goodFetch=async()=>{calls++;return new Response(JSON.stringify({frozen_id:'MM-AI-x',result:{}}),{status:200,headers:{'content-type':'application/json'}});};
  const result=await requestAnalysis(goodFetch,'https://api.example.test','hello');
  assert.equal(calls,1);
  assert.equal(result.frozen_id,'MM-AI-x');

  const badFetch=async()=>new Response(JSON.stringify({error:'Temporary outage'}),{status:503,headers:{'content-type':'application/json'}});
  await assert.rejects(()=>requestAnalysis(badFetch,'https://api.example.test','hello'),/Temporary outage/);
});
