import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalRequestPayload, canonicalRequestHash, frozenIdFromHash } from '../worker/src/hash.js';

test('canonical identity excludes display view and is deterministic', async () => {
  const a = canonicalRequestPayload('Hello world');
  assert.equal('view' in a, false);
  assert.equal(a.max_output_tokens, 12000);
  assert.deepEqual(a, canonicalRequestPayload('Hello world'));
  const h1 = await canonicalRequestHash('Hello world');
  const h2 = await canonicalRequestHash('Hello world');
  assert.equal(h1, h2);
  assert.notEqual(h1, await canonicalRequestHash('Hello world!'));
  assert.match(frozenIdFromHash(h1), /^MM-AI-[0-9a-f]{16}$/);
  assert.equal(frozenIdFromHash(h1), frozenIdFromHash(h2));
});
