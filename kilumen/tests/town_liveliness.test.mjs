// R7 liveliness (GD Oct 30 2026, Coder review of 0e9b8e6a): every town built by a living_town script passes the
// layering_rules R7 check (NPCs, decorated squares, at most half the ground paved, at least one strolling NPC), and the
// sealed-nook rule lets a small sealed shelf holding content count as a pocket. Run: node --test tests/town_liveliness.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const ROOT = new URL('..', import.meta.url).pathname;
const run = () => JSON.parse(execFileSync('python3', ['tools/map_audit/layering_rules.py', '--json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }));
const ALL = run();
test('living towns pass R7 liveliness', () => {
  const towns = ALL.filter((a) => 'R7_ok' in a);
  assert.ok(towns.some((a) => a.map === 'revival_heights'), 'revival_heights is checked');
  for (const a of towns) assert.ok(a.R7_ok, `${a.map} ${JSON.stringify(a.live)}`);
});
test('Revival Heights: at most half paved, 2+ strollers', () => {
  const a = ALL.find((x) => x.map === 'revival_heights'); assert.ok(a.live.paved <= 0.5 && a.live.strollers >= 2, JSON.stringify(a.live));
});
