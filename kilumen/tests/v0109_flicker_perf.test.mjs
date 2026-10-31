// v0.2.109: TV / sink / server-rack props draw their own still art (no cross-model anim frames), and the garden view
// wrapper runs life.over/top on the real LivingWorld (no per-frame cloud rebuild).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const anim = JSON.parse(fs.readFileSync(new URL('../art/world/overworld/furniture_v3_anim.json', import.meta.url)));
const flat = JSON.stringify(anim);
test('no TV / sink / server-rack animation ids', () => {
  for (const id of [7303, 7304, 7291, 7292, 7209, 2089, 2090, 814, 9409, 9414, 9115, 9120, 9394, 9399]) assert.ok(!new RegExp(`"${id}"\\s*:`).test(flat), `id ${id} still animated`);
});
test('garden view delegates over/top to the real life object', () => {
  const s = fs.readFileSync(new URL('../src/garden/index.js', import.meta.url), 'utf8');
  assert.match(s, /v\.life\.over = \(c, vv\) => life\.over\(c, vv\)/);
  assert.match(s, /v\.life\.top = \(c, vv\) => life\.top\(c, vv\)/);
});
test('mobile fit check is throttled', () => {
  const s = fs.readFileSync(new URL('../src/overworld/overworld.js', import.meta.url), 'utf8');
  assert.match(s, /_fitCheck\(\) \{\s*\/\/[^\n]*\n\s*const now = performance\.now\(\); if \(now - \(this\._fitT/);
});
