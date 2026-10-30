// WD flashback lab (fin_past_wlab_01..10) wiring: arrival, gates, TALK, teams, broken-glass swap.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as R9 from '../src/region9/index.js';
import { WELLSPIRE_TEAMS } from '../src/region9/teams.js';
const J = (m) => JSON.parse(fs.readFileSync(new URL(`../art/world/overworld/maps/${m}.json`, import.meta.url)));
const TS = JSON.parse(fs.readFileSync(new URL('../art/world/overworld/tileset_arena.json', import.meta.url)));

test('wlab: flashback lands on a walkable room-1 cell; guardian keys room 10', () => {
  const t = R9.FLASHBACK.to, m = J(t.map);
  assert.equal(t.map, 'fin_past_wlab_01_entry'); assert.equal(m.layers.collision[t.y][t.x], 0);
  assert.equal(R9.R9.guardianMap, 'fin_past_wlab_10_ondravel');
  for (const p of R9.R9.phases) assert.ok(WELLSPIRE_TEAMS[`fin_past_wlab_10_ondravel.${p}`], p);
  const l = R9.R9.topLanding; assert.equal(J(l.map).layers.collision[l.y][l.x], 0);
  assert.deepEqual(J('fin_past_wlab_10_ondravel').ondravel.x, 7);
});

test('wlab: every map trainer has TALK lines, a team, and gates its forward door', () => {
  const ids = [];
  R9.WLAB_MAPS.forEach((m, i) => {
    const tr = J(m).npcs.filter((n) => /trainer/.test(n.kind || '')).map((n) => n.id).sort();
    assert.deepEqual(tr, [...R9.WLAB_TRAINERS[i]].sort(), m);
    for (const id of tr) { ids.push(id); assert.ok(R9.TALK[id]?.intro && R9.TALK[id]?.after, id); assert.ok(WELLSPIRE_TEAMS[`${m}.${id}`], id); }
    if (i < 9) {
      const to = R9.WLAB_MAPS[i + 1], seen = {};
      assert.ok(R9.warpBlockedFor(m, to, new Set(), seen), `${m} gate shut`);
      for (const id of tr) seen[`defeated:${m}.${id}`] = true;
      assert.ok(!R9.warpBlockedFor(m, to, new Set(), seen), `${m} gate open`);
    }
  });
  assert.equal(ids.length, 16);
  assert.equal(R9.TALK.fin_wlab_chief.flag, 'fin_enc_lead_beaten');
});

test('wlab: tank swaps to broken glass on fin_released (all 30 cells, tiles exist)', () => {
  const m = J('fin_past_wlab_10_ondravel'), names = new Set(TS.tiles.map((t) => t.name));
  assert.equal(m.flag_swaps.length, 30);
  for (const f of m.flag_swaps) { assert.equal(f.flag, 'fin_released'); assert.ok(names.has(f.before) && names.has(f.after), f.after); }
});

test('wlab: Text Bot v2 lines merged (pages / battle_lost / battle_won / after) for all 16 lab trainers', async () => {
  const fs = await import('node:fs');
  const L = JSON.parse(fs.readFileSync(new URL('../text/overworld_lines.json', import.meta.url), 'utf8'));
  const src = JSON.parse(fs.readFileSync(new URL('../data/textbot_flashback_lab_v2.json', import.meta.url), 'utf8'));
  let n = 0;
  for (const [m, ids] of Object.entries(src.maps)) for (const [id, e] of Object.entries(ids)) {
    const o = L.maps[m][id]; n++;
    assert.deepEqual(o.pages, e.intro); assert.deepEqual(o.battle_lost, e.battle_lost); assert.deepEqual(o.battle_won, e.battle_won); assert.deepEqual(o.after, e.after);
  }
  assert.equal(n, 16);
  assert.equal(L.system_halls.hint_frostspire.pages.length, 2);
  assert.equal(L.region4.npcs.climber.start[0], src.frostspire_climber_fix.new);
});
