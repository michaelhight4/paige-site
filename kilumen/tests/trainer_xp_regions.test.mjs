// Trainer XP by region + region 5-8 team sizes (Gary, Oct 31 2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { KILUMEN_RULES as K } from '../src/battle/data/rules.js';
import { regionOf, trainerXpMult } from '../src/battle/data/xp_regions.js';

test('trainer XP: regions 1-4 give 25% less (1.125), regions 5+ and post-game keep 1.5', () => {
  assert.equal(K.xpTrainerMult, 1.5); assert.equal(K.xpTrainerMultEarly, 1.125); assert.equal(K.xpTrainerMultEarly, K.xpTrainerMult * 0.75);
  const early = ['route1', 'brookhollow', 'fernwick_hall_int', 'thornwood', 'route_east', 'saltmere', 'route_revival', 'revival_heights', 'frostspire_pass', 'route_revival_saltmere'];
  for (const map of early) assert.equal(trainerXpMult({ map, id: 'trainer_1' }), 1.125, map);
  const late = ['route_revival_sunmeadow', 'sunmeadow_fields', 'mirefen_hall_int', 'route_coast', 'tidewater_coast', 'lanternport', 'route_fernwick_lanternport', 'cindervale', 'aurelith', 'r9_cairnfold', 'fin_summit_camp', 'gullhaven_sea'];
  for (const map of late) assert.equal(trainerXpMult({ map, id: 'trainer_1' }), 1.5, map);
  assert.equal(regionOf('route_revival_saltmere'), 4); assert.equal(regionOf('route_revival'), 3); // longest prefix wins
  assert.equal(trainerXpMult({ map: 'route_east', id: 'r9_rep_nookie' }), 1.5); // post-game trainer on an early map
  for (const n of [1, 2, 3, 4]) assert.equal(trainerXpMult({ masterNumber: n }), 1.125);
  for (const n of [5, 6, 7, 8]) assert.equal(trainerXpMult({ masterNumber: n, map: 'route1' }), 1.5);
});

test('region 5-8 trainers and Masters field 4-6 Kilu; aces kept on top', () => {
  const sp = new Set(JSON.parse(fs.readFileSync('data/encounters_wired.json', 'utf8')).species_with_art);
  const M = JSON.parse(fs.readFileSync('data/masters.json', 'utf8'));
  for (const h of M.halls.filter((h) => h.coin_number >= 5)) {
    const ace = Math.max(...h.master.team.map((m) => m.level));
    assert.equal(h.master.ace_level, ace, `${h.zone} ace_level`);
    for (const t of [h.master, ...h.trainers]) {
      assert.ok(t.team.length >= 4 && t.team.length <= 6, `${h.zone}.${t.id} ${t.team.length}`);
      for (const m of t.team) assert.ok(sp.has(m.battle_species || m.species), m.species);
    }
    for (const t of h.trainers) assert.ok(Math.max(...t.team.map((m) => m.level)) <= ace, `${h.zone}.${t.id} above the ace`);
  }
  const dir = 'art/world/overworld/maps'; let n = 0;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const map = f.slice(0, -5), r = regionOf(map);
    if (!(r >= 5 && r <= 8)) continue;
    for (const d of JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8')).npcs || []) {
      if (!Array.isArray(d.team) || /^(r9_|fin_)/.test(d.id) || d.kind === 'rival') continue;
      n++; assert.ok(d.team.length >= 4 && d.team.length <= 6, `${map}.${d.id} ${d.team.length}`);
    }
  }
  assert.ok(n >= 40, `region 5-8 map trainers checked: ${n}`);
});
