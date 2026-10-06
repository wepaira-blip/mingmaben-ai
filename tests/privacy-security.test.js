import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../', import.meta.url).pathname;

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function allText(dir = root) {
  const out = [];
  const skip = new Set(['.git', 'node_modules', '.superpowers']);
  function walk(p) {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      if (skip.has(e.name)) continue;
      const f = path.join(p, e.name);
      if (e.isDirectory()) walk(f);
      else if (/\.(js|json|md|html|css|toml|sql|txt)$/.test(e.name) || ['LICENSE','.gitignore'].includes(e.name)) {
        out.push(fs.readFileSync(f, 'utf8'));
      }
    }
  }
  walk(dir);
  return out.join('\n');
}

test('public and backend config obey safety boundary', async () => {
  const publicConfig = await import('../web/config.js');
  const backendConfig = await import('../worker/src/config.js');
  assert.deepEqual(Object.keys(publicConfig).sort(), ['API_BASE_URL', 'SUPPORT_URL']);
  assert.equal(backendConfig.MODEL, 'gpt-6.1-sol');
  assert.equal(backendConfig.REASONING_EFFORT, 'high');
  assert.equal(backendConfig.DAILY_ANALYSIS_LIMIT, 5);
});

test('repository contains no obvious OpenAI or banking secrets', () => {
  const text = allText();
  assert.doesNotMatch(text, /sk-[A-Za-z0-9_-]{12,}/);
  assert.doesNotMatch(text, new RegExp(['026','073','150'].join('')));
  assert.doesNotMatch(text, new RegExp(['8311','726','144'].join('')));
  assert.doesNotMatch(text, new RegExp(['CMFG','US','33'].join('')));
});

test('public disclosures state independent research, privacy, and voluntary support boundaries', () => {
  const pages = ['web/index.html','web/about.html','web/privacy.html','docs/PRIVACY.md','docs/METHOD.md']
    .map(read).join('\n');
  assert.match(pages,/Independently developed and maintained by Li WenGuan/);
  assert.match(pages,/Participation is free/i);
  assert.match(pages,/Support is voluntary/i);
  assert.match(pages,/not an investment/i);
  assert.match(pages,/not.*purchase/i);
  assert.match(pages,/not.*subscription/i);
  assert.match(pages,/no promise of financial return/i);
  assert.match(pages,/submitted text.*sent.*AI service/is);
  assert.match(pages,/frozen readings.*stored.*repeatability/is);
  assert.match(pages,/passwords.*bank details.*government IDs/is);
  assert.match(pages,/not automatically published/i);
  assert.match(pages,/experimental structural reading/i);
});
