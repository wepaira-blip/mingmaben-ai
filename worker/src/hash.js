import { MODEL, REASONING_EFFORT, METHOD_VERSION, PROMPT_VERSION, MAX_OUTPUT_TOKENS } from './config.js';

export function canonicalRequestPayload(sourceText='') {
  return {
    source_text: String(sourceText),
    model: MODEL,
    reasoning_effort: REASONING_EFFORT,
    method_version: METHOD_VERSION,
    prompt_version: PROMPT_VERSION,
    max_output_tokens: MAX_OUTPUT_TOKENS,
  };
}

export async function canonicalRequestHash(sourceText='') {
  const payload = JSON.stringify(canonicalRequestPayload(sourceText));
  const bytes = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

export function frozenIdFromHash(hash='') {
  return `MM-AI-${String(hash).slice(0,16)}`;
}
