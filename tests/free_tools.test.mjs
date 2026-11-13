// Free tools pass (Oct 23, 2026): stats.js stays behind ?debug=perf; oxipng copies are lossless and never in place;
// the Piscina + simple-statistics encounter sim agrees with the table weights. Tool tests skip when tools/free_tools
// is not installed (CI only runs the root npm ci).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FREE = join(ROOT, 'tools/free_tools/node_modules');

test('stats.js ships only behind ?debug=perf', () => {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const lines = html.split('\n').filter((l) => /debug_perf|stats\.min/.test(l));
  if (!lines.length && existsSync(join(ROOT, 'src/alpha.js'))) return; // live alpha build ships no perf overlay loader at all
  assert.equal(lines.length, 1, 'one loader line');
  assert.match(lines[0], /if \(\/\[\?&\]debug=perf\\b\/\.test\(location\.search\)\) import\('\.\/src\/debug_perf\.js'\)/);
  const offenders = [];
  const walk = (d) => { for (const n of readdirSync(d, { withFileTypes: true })) { const p = join(d, n.name); if (n.isDirectory()) { if (!p.includes('/vendor/')) walk(p); } else if (/\.m?js$/.test(n.name) && !p.endsWith('debug_perf.js') && /debug_perf|stats\.min/.test(readFileSync(p, 'utf8'))) offenders.push(p); } };
  walk(join(ROOT, 'src'));
  assert.deepEqual(offenders, [], 'no game module imports the perf panel');
  assert.match(readFileSync(join(ROOT, 'src/debug_perf.js'), 'utf8'), /debug=perf/);
});

test('oxipng helper: optimised copy is pixel-identical and the original is untouched', { skip: !existsSync(join(ROOT, 'tools/free_tools/bin/oxipng')) && 'oxipng not installed' }, async () => {
  const { optimise } = await import('../tools/assets/png_optimize.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'oxi-')), src = join(dir, 'tile.png');
  const p = new PNG({ width: 32, height: 32 });
  for (let i = 0; i < 32 * 32; i++) p.data.set([(i % 7) * 30, (i % 3) * 80, 90, 255], i * 4);
  writeFileSync(src, PNG.sync.write(p, { deflateLevel: 0 }));
  const before = readFileSync(src);
  const [row] = optimise([src], { out: join(dir, 'out') });
  assert.equal(row.identical, true);
  assert.ok(row.after < row.before, 'smaller');
  assert.deepEqual(readFileSync(src), before, 'original unchanged');
});

test('encounter sim (Piscina + simple-statistics): observed species share matches the weights', { skip: !existsSync(join(FREE, 'piscina')) && 'tools/free_tools not installed' }, async () => {
  const { simulate } = await import('../tools/sim/encounter_sim.mjs');
  const rows = await simulate({ n: 4000, phases: ['day', 'night'] });
  assert.ok(rows.length >= 2);
  for (const r of rows) {
    assert.ok(r.empty < r.rolls, `${r.zone} ${r.phase}: some slot is eligible`);
    assert.deepEqual(r.drift.filter((d) => Math.abs(parseFloat(d.split(' ')[1]) - parseFloat(d.split('vs ')[1])) > 4), [], `${r.zone} ${r.phase}`);
  }
});
