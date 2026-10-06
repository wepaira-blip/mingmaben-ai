import { MAX_INPUT_CHARS, DAILY_ANALYSIS_LIMIT } from './config.js';
import { anonymousDailyKey, consumeDailyQuota, d1UsageStore } from './rate-limit.js';
import { getOrCreateReading } from './readings.js';
import { d1FeedbackStore, saveFeedback } from './feedback.js';

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function validateAnalyzeRequest(body) {
  if (!body || typeof body.text !== 'string') throw new HttpError(400, 'Text must be a string.');
  const sourceText = body.text.trim();
  if (!sourceText) throw new HttpError(400, 'Text is required.');
  if (sourceText.length > MAX_INPUT_CHARS) throw new HttpError(413, `Text exceeds ${MAX_INPUT_CHARS} characters.`);
  return { sourceText };
}

function json(data, status=200, extraHeaders={}) {
  return new Response(JSON.stringify(data), {
    status,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'access-control-allow-origin':'*',
      'access-control-allow-headers':'content-type',
      'access-control-allow-methods':'GET,POST,OPTIONS',
      ...extraHeaders
    }
  });
}

export async function handleRequest(request, env={}, deps={}) {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'content-type','access-control-allow-methods':'GET,POST,OPTIONS'}});
  if (url.pathname === '/api/health' && request.method === 'GET') return json({ok:true,service:'mingmaben-ai'});

  if (url.pathname === '/api/feedback' && request.method === 'POST') {
    try {
      let body;
      try { body = await request.json(); } catch { throw new HttpError(400,'Invalid JSON.'); }
      const store = deps.feedbackStore || d1FeedbackStore(env.DB);
      const saved = await saveFeedback(store, body?.frozen_id, body?.rating, deps.now || (()=>new Date()));
      return json({ok:true,feedback:saved});
    } catch (error) {
      const status = Number(error?.status) || 500;
      return json({error:error?.message || 'Internal error'},status);
    }
  }

  if (url.pathname !== '/api/analyze' || request.method !== 'POST') return json({error:'Not found'},404);

  try {
    let body;
    try { body = await request.json(); } catch { throw new HttpError(400,'Invalid JSON.'); }
    const { sourceText } = validateAnalyzeRequest(body);
    const now = (deps.now || (()=>new Date()))();
    const day = now.toISOString().slice(0,10);
    const key = await anonymousDailyKey(request, day);
    const usageStore = deps.usageStore || d1UsageStore(env.DB);
    let quota = { count: await usageStore.getUsage(key, day), limit: DAILY_ANALYSIS_LIMIT };
    const beforeCreate = async () => {
      quota = await consumeDailyQuota(usageStore, key, day, DAILY_ANALYSIS_LIMIT);
      if (!quota.allowed) throw new HttpError(429,'Daily analysis limit reached.');
    };

    const analyze = deps.analyze || getOrCreateReading;
    const result = await analyze(env, sourceText, { beforeCreate, ...(deps.analyzeDeps || {}) });
    return json(result,200,{'x-ratelimit-remaining':String(Math.max(0, DAILY_ANALYSIS_LIMIT-quota.count))});
  } catch (error) {
    const status = Number(error?.status) || 500;
    return json({error:error?.message || 'Internal error'},status);
  }
}

export default { fetch: handleRequest };
