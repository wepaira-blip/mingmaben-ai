import test from 'node:test';
import assert from 'node:assert/strict';
import { requestMingmabenReading } from '../worker/src/openai.js';
import { MINGMABEN_SYSTEM_PROMPT } from '../worker/src/prompt.js';

const modelReading = {
  language_detected:'en',
  surface_meaning_en:'surface', surface_meaning_zh:'表面',
  canonical_reading_en:'reading', canonical_reading_zh:'显影',
  whole_form_mechanism_en:'mechanism', whole_form_mechanism_zh:'机制',
  structural_evidence:['parallel relation'],
  layer0_relevance:[],
  incremental_information_en:'increment', incremental_information_zh:'增量',
  uncertainties_en:'none', uncertainties_zh:'无',
  structural_evidence_strength:'moderate',
  later_outcome_confirmation:'not_evaluated',
  reality_boundary_en:'experimental only', reality_boundary_zh:'仅实验'
};

test('prompt encodes Mingmaben discipline rather than mechanical letter concatenation',()=>{
  assert.match(MINGMABEN_SYSTEM_PROMPT,/timeless structural field/i);
  assert.match(MINGMABEN_SYSTEM_PROMPT,/do not mechanically/i);
  assert.match(MINGMABEN_SYSTEM_PROMPT,/freeze/i);
  assert.match(MINGMABEN_SYSTEM_PROMPT,/later reality/i);
  assert.match(MINGMABEN_SYSTEM_PROMPT,/no stable whole-form mechanism/i);
});

test('Responses API request uses Sol high reasoning, structured output, and store false', async()=>{
  let seen;
  const fetchImpl=async(url,opts)=>{
    seen={url,opts,body:JSON.parse(opts.body)};
    return new Response(JSON.stringify({
      id:'resp_test_1',
      output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(modelReading)}]}]
    }),{status:200,headers:{'content-type':'application/json'}});
  };
  const result=await requestMingmabenReading({OPENAI_API_KEY:'test-placeholder'},'hello',{fetchImpl});
  assert.equal(result.reading.canonical_reading_en,'reading');
  assert.equal(result.responseId,'resp_test_1');
  assert.equal(seen.url,'https://api.openai.com/v1/responses');
  assert.equal(seen.body.model,'gpt-6.1-sol');
  assert.equal(seen.body.reasoning.effort,'high');
  assert.equal(seen.body.store,false);
  assert.equal(seen.body.max_output_tokens,12000);
  assert.equal(seen.body.text.format.type,'json_schema');
  assert.equal(seen.body.text.format.strict,true);
  assert.equal(seen.body.input[0].role,'developer');
  assert.equal(seen.body.input[1].role,'user');
});

test('malformed model output is rejected',async()=>{
  const fetchImpl=async()=>new Response(JSON.stringify({id:'bad',output:[{type:'message',content:[{type:'output_text',text:'{}'}]}]}),{status:200});
  await assert.rejects(()=>requestMingmabenReading({OPENAI_API_KEY:'x'},'hello',{fetchImpl}),/language_detected/);
});
