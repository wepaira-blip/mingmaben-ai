import { MODEL, REASONING_EFFORT, METHOD_VERSION, PROMPT_VERSION } from './config.js';
import { canonicalRequestHash, frozenIdFromHash } from './hash.js';
import { requestMingmabenReading } from './openai.js';

function rowToRecord(row){
  if(!row) return null;
  return {
    frozen_id:row.frozen_id,
    request_hash:row.request_hash,
    source_text:row.source_text,
    model:row.model,
    reasoning_effort:row.reasoning_effort,
    method_version:row.method_version,
    prompt_version:row.prompt_version,
    model_response_id:row.model_response_id || null,
    result:typeof row.result_json === 'string' ? JSON.parse(row.result_json) : row.result,
    created_at:row.created_at
  };
}

export function d1ReadingStore(db){
  if(!db) throw Object.assign(new Error('D1 database is not configured.'),{status:503});
  return {
    async getByHash(hash){
      const row=await db.prepare('SELECT * FROM readings WHERE request_hash = ? LIMIT 1').bind(hash).first();
      return rowToRecord(row);
    },
    async tryClaim(hash, nowIso){
      const stale=new Date(Date.parse(nowIso)-2*60*1000).toISOString();
      await db.prepare('DELETE FROM reading_claims WHERE claimed_at < ?').bind(stale).run();
      const result=await db.prepare('INSERT OR IGNORE INTO reading_claims (request_hash, claimed_at) VALUES (?, ?)').bind(hash,nowIso).run();
      return Number(result?.meta?.changes || 0) > 0;
    },
    async releaseClaim(hash){
      await db.prepare('DELETE FROM reading_claims WHERE request_hash = ?').bind(hash).run();
    },
    async insertReading(record){
      await db.prepare(`INSERT OR IGNORE INTO readings
        (frozen_id, request_hash, source_text, model, reasoning_effort, method_version, prompt_version, model_response_id, result_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          record.frozen_id, record.request_hash, record.source_text, record.model,
          record.reasoning_effort, record.method_version, record.prompt_version,
          record.model_response_id, JSON.stringify(record.result), record.created_at
        ).run();
    }
  };
}

function publicFrozen(record,cached){
  return {
    frozen_id:record.frozen_id,
    source_text:record.source_text,
    model:record.model,
    reasoning_effort:record.reasoning_effort,
    method_version:record.method_version,
    prompt_version:record.prompt_version,
    created_at:record.created_at,
    result:record.result,
    cached:Boolean(cached)
  };
}

export async function getOrCreateReading(env, sourceText, deps={}){
  const requestHash=await canonicalRequestHash(sourceText);
  const store=deps.store || d1ReadingStore(env.DB);
  const existing=await store.getByHash(requestHash);
  if(existing) return publicFrozen(existing,true);

  const now=(deps.now || (()=>new Date()))();
  const nowIso=now.toISOString();
  const claimed=await store.tryClaim(requestHash,nowIso);
  if(!claimed){
    const sleep=deps.sleep || (ms=>new Promise(resolve=>setTimeout(resolve,ms)));
    const attempts=deps.pollAttempts ?? 60;
    const delay=deps.pollDelayMs ?? 500;
    for(let i=0;i<attempts;i++){
      await sleep(delay);
      const winner=await store.getByHash(requestHash);
      if(winner) return publicFrozen(winner,true);
    }
    throw Object.assign(new Error('This analysis is already in progress. Please retry shortly.'),{status:503});
  }

  try{
    if(deps.beforeCreate) await deps.beforeCreate();
    const requester=deps.requester || requestMingmabenReading;
    const response=await requester(env,sourceText);
    const record={
      frozen_id:frozenIdFromHash(requestHash),
      request_hash:requestHash,
      source_text:String(sourceText),
      model:MODEL,
      reasoning_effort:REASONING_EFFORT,
      method_version:METHOD_VERSION,
      prompt_version:PROMPT_VERSION,
      model_response_id:response.responseId || null,
      result:response.reading,
      created_at:nowIso
    };
    await store.insertReading(record);
    const winner=await store.getByHash(requestHash);
    if(!winner) throw new Error('Frozen reading could not be persisted.');
    return publicFrozen(winner,false);
  } finally {
    await store.releaseClaim(requestHash);
  }
}
