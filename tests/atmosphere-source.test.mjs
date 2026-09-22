import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { STYLE, SCRIPT, IMPORT, BUILD } from '../scripts/atmosphere-hooks.mjs';

test('all 32 verified upstream example files remain byte-identical', async () => {
  const manifest = JSON.parse(await readFile(new URL('../atmosphere/original-files.sha256.json', import.meta.url)));
  assert.equal(Object.keys(manifest).length, 32);
  for (const [file, digest] of Object.entries(manifest)) {
    const bytes = await readFile(new URL('../atmosphere/' + file, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), digest, file);
  }
});
test('supplemental benchmark source matches the pinned upstream Git blob', async () => {
  const bytes = await readFile(new URL('../atmosphere/bench.ts', import.meta.url));
  assert.equal(createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex'), 'b061d5e5efe5e9f4eaa09a778a1022e27d90d96b');
});
test('actual website template and builder are unchanged apart from additive hooks', async t => {
  const root = new URL('../', import.meta.url);
  let original;
  try { original = file => execFileSync('git', ['show', `7c3c527363fabf1fa9ecfb53a5667c44d7646cba:${file}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); original('package.json'); }
  catch { t.skip('Original baseline commit not available in this source-only copy.'); return; }
  const html = await readFile(new URL('../src/page.template.html', import.meta.url), 'utf8');
  const builder = await readFile(new URL('../scripts/build-page.mjs', import.meta.url), 'utf8');
  assert.equal(html.replace(STYLE, '').replace(SCRIPT, ''), original('src/page.template.html'));
  assert.equal(builder.replace(IMPORT, '').replace(BUILD, ''), original('scripts/build-page.mjs'));
});
