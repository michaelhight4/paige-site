// Wellspire world fill (Coder, Oct 30 2026; data/textbot_world_fill.json section 1): every r9/fin line is wired, each
// r9 trainer has its own talk entry, the Lab 1 window shows the storm before the Chief, the new signs sit on real sign art.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const R9 = await import('../src/region9/index.js');
const { FB } = await import('../src/region9/text_fallback.js');
const MAPS = 'art/world/overworld/maps';
const FILL = J('data/textbot_world_fill.json').section1_postgame_finale;
const LINES = J('text/overworld_lines.json');
const TS = new Map(J('art/world/overworld/tileset.json').tiles.map((t) => [t.id, t]));
const get = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
const BANNED = /\b(PP|shiny|super effective|Pok[eé]dex|Pok[eé] Ball|Gotcha!|nurse|weed|routes?|berr(y|ies)|elite|gym)\b/i;

test('r9 fill: all 103 section-1 keys are in overworld_lines at their root path, same pages, no blocked words', () => {
  const keys = Object.keys(FILL.lines); assert.equal(keys.length, 103);
  for (const k of keys) {
    assert.deepEqual(get(LINES, k)?.pages, FILL.lines[k].pages, k);
    for (const p of FILL.lines[k].pages) assert.ok(!BANNED.test(p), `${k}: ${p}`);
  }
});

test('r9 fill: every r9/fin trainer has its own TALK entry; NEW keys are used; none falls back to the shared after', () => {
  const used = new Set(Object.values(R9.TALK).flatMap((t) => [t.say, t.intro, t.after, t.lose, t.wait]).filter(Boolean));
  for (const f of fs.readdirSync(MAPS).filter((f) => /^(r9_|fin_)/.test(f))) {
    for (const n of J(`${MAPS}/${f}`).npcs || []) if (n.kind === 'trainer') assert.ok(R9.TALK[n.id], `${f}: ${n.id} has no TALK entry`);
  }
  for (const [k, v] of Object.entries(FILL.lines)) if (/^NEW: TALK/.test(v.used_by)) assert.ok(used.has(k), `${k} (${v.used_by}) not wired`);
  for (const id of ['r9_rb_hiker', 'r9_skylift_rider', 'r9_sw_climber_2', 'r9_ic_keeper']) assert.notEqual(R9.TALK[id].after, 'r9.trainer_after', id);
});

test('r9 fill: fin_lab1_window shows the storm before the Chief, the lights after; Coralie reads a name tag', async () => {
  const said = [];
  const mk = (flags) => ({ flags: new Set(flags), seen: {}, lines: LINES, log: [], map: { name: 'fin_past_lab1_f4' }, player: { x: 17, y: 3 },
    setFlag(f) { this.flags.add(f); }, say: async (p) => { said.push(...p); }, ask: async () => 0, startWarp() {}, script: async (fn) => fn(), hooks: {}, systems: {} });
  const a = mk([]); const api = R9.attachRegion9(a);
  assert.ok(await api.runSpot({ id: 'fin_lab1_window' }));
  assert.deepEqual(said.splice(0), FILL.lines['fin.lab1.window_storm'].pages);
  const b = mk(['fin_spire_floor_4']); const api2 = R9.attachRegion9(b);
  await api2.runSpot({ id: 'fin_lab1_window' });
  assert.deepEqual(said.splice(0), FILL.lines['fin.lab1.window_lights'].pages);
  assert.match(FB['fin.t.coralie_door'].join(' '), /name tag/); assert.doesNotMatch(FB['fin.t.coralie_door'].join(' '), /badge/i);
  assert.match(get(LINES, 'fin.t.coralie_door').pages.join(' '), /name tag/);
});

test('r9 fill: the 9 new signs are interact spots on solid sign/bench art with a walkable stand, lines in maps.<map>.<id>', () => {
  for (const s of FILL.new_signs) {
    const m = J(`${MAPS}/${s.map}.json`), sp = (m.interact_spots || []).find((q) => q.id === s.id);
    assert.ok(sp, s.id);
    const name = TS.get(m.layers.decoration[sp.y][sp.x])?.name;
    assert.ok(['sign', 'memorial_bench'].includes(name), `${s.id} at ${sp.x},${sp.y} sits on ${name}`);
    assert.equal(m.layers.collision[sp.y][sp.x], 1, s.id);
    assert.equal(m.layers.collision[sp.stand[1]][sp.stand[0]], 0, `${s.id} stand`);
    assert.deepEqual(LINES.maps[s.map][s.id].pages, s.pages, s.id);
  }
});
