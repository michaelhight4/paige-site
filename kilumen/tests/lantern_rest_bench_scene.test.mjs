// finish-a item 4: after credits 2 (reportAtWork), before THE END, an optional sit at the Lantern Rest bench.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { attachRegion9, BENCH } from '../src/region9/index.js';
const lines = JSON.parse(fs.readFileSync(new URL('../text/overworld_lines.json', import.meta.url)));
const src = fs.readFileSync(new URL('../src/region9/index.js', import.meta.url), 'utf8');

function mock(answer) {
  const said = [], warps = [];
  const scene = { flags: new Set(), lines, tick: 0, log: [], player: { x: 6, y: 5, facing: 'down' },
    say: async (p) => { said.push(p.join('|')); }, ask: async () => answer,
    startWarp: (s) => { warps.push(s); } };
  const r9 = attachRegion9(scene, { systems: {} }); r9.stop?.();
  return { scene, r9, said, warps };
}

test('bench scene runs after credits 2 and before THE END', () => {
  const body = src.slice(src.indexOf('async function reportAtWork'), src.indexOf('function coralieDue'));
  const c = body.indexOf("variant: 'ending2'"), b = body.indexOf('await benchScene()'), e = body.indexOf("'fin.epilogue.postgame'");
  assert.ok(c > 0 && b > c && e > b);
});

test('yes: warps to the Lantern Rest bench and plays the bench lines', async () => {
  const { r9, said, warps, scene } = mock(0);
  assert.equal(await r9.benchScene(), true);
  assert.deepEqual(warps, [BENCH]);
  assert.ok(said.some((s) => /bench/i.test(s) && /eight/i.test(s))); // canon fin.epilogue.bench
  assert.ok(said.includes(lines.fin.epilogue.bench_sit.pages.join('|')));
  assert.ok(scene.flags.has('fin_bench_sat'));
});

test('no: skipped, nothing moves', async () => {
  const { r9, said, warps } = mock(1);
  assert.equal(await r9.benchScene(), false); assert.equal(warps.length, 0); assert.equal(said.length, 0);
});

test('bench stand is the fin_bench_swap stand on a walkable cell; draft keys flagged for Text Bot', () => {
  const m = JSON.parse(fs.readFileSync(new URL('../art/world/overworld/maps/lantern_rest.json', import.meta.url)));
  const sp = m.interact_spots.find((s) => s.id === 'fin_bench_swap');
  assert.deepEqual([BENCH.x, BENCH.y], sp.stand);
  assert.ok([0, 2, 4, 7, 8, 9, 10].includes(m.layers.collision[BENCH.y][BENCH.x]));
  for (const k of ['bench_ask', 'bench_sit']) assert.match(lines.fin.epilogue[k].textbot_review, /Text Bot/);
});
