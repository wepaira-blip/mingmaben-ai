import { MODEL, REASONING_EFFORT, MAX_OUTPUT_TOKENS } from './config.js';
import { MINGMABEN_SYSTEM_PROMPT } from './prompt.js';
import { READING_SCHEMA, validateModelReading } from './schema.js';

function extractOutputText(payload){
  if(typeof payload?.output_text === 'string' && payload.output_text.trim()) return payload.output_text;
  for(const item of payload?.output || []){
    if(item?.type !== 'message') continue;
    for(const part of item?.content || []) if(part?.type === 'output_text' && typeof part.text === 'string') return part.text;
  }
  throw new Error('OpenAI response contained no output text.');
}

export async function requestMingmabenReading(env, sourceText, {fetchImpl=fetch}={}){
  if(!env?.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured.');
  const body={
    model:MODEL,
    reasoning:{effort:REASONING_EFFORT},
    store:false,
    max_output_tokens:MAX_OUTPUT_TOKENS,
    input:[
      {role:'developer',content:[{type:'input_text',text:MINGMABEN_SYSTEM_PROMPT}]},
      {role:'user',content:[{type:'input_text',text:String(sourceText)}]}
    ],
    text:{
      format:{
        type:'json_schema',
        name:'mingmaben_frozen_reading',
        strict:true,
        schema:READING_SCHEMA
      }
    }
  };
  const response=await fetchImpl('https://api.openai.com/v1/responses',{
    method:'POST',
    headers:{'authorization':`Bearer ${env.OPENAI_API_KEY}`,'content-type':'application/json'},
    body:JSON.stringify(body)
  });
  let payload;
  try { payload=await response.json(); } catch { throw new Error(`OpenAI returned non-JSON response (${response.status}).`); }
  if(!response.ok) throw new Error(payload?.error?.message || `OpenAI request failed (${response.status}).`);
  const text=extractOutputText(payload);
  let parsed;
  try { parsed=JSON.parse(text); } catch { throw new Error('OpenAI structured output was not valid JSON.'); }
  return {reading:validateModelReading(parsed),responseId:payload.id || null};
}
