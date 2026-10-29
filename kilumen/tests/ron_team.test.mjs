// Ron's teams (Oct 29 2026, Gary 5:09 PM): same base 3 all game + 3 slots rolled once per save, sizes 2/3/4 then 6.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ronTeam, rollRon, ensureRonRoll, normRonRoll, RON_FIGHTS, RON_ORDER, stageFor, debutFight } from '../src/battle/data/ron_team.js';
import { RON_POOLS } from '../src/battle/data/ron_pools.gen.js';
import { evoTable } from '../src/systems/evolution.js';
import { SPECIES } from '../src/ui/data.js';
import { STARTER_LINES } from '../src/battle/data/starters.js';
import { normalise, freshSave } from '../src/overworld/save.js';
import { authoredTeam } from '../src/battle/data/trainer_teams.js';

const STARTERS3 = ['nibbin', 'cindrip', 'rillop'];
const reg = new Set(SPECIES.map((s) => s.id));
const hasArt = (s) => fs.existsSync(`art/characters/pixel/creatures/${s}`);
const t = evoTable(), prevo = {}; for (const [id, e] of Object.entries(t)) prevo[e.to] = id;
const root = (s) => { while (prevo[s]) s = prevo[s]; return s; };

test('same save -> same team; different seeds -> different teams', () => {
  const a = rollRon('kAAA'), b = rollRon('kAAA');
  assert.deepEqual(a, b);
  assert.deepEqual(ronTeam('ron_final', 'nibbin', a), ronTeam('ron_final', 'nibbin', b));
  const teams = new Set(); for (let i = 0; i < 40; i++) teams.add(JSON.stringify(ronTeam('ron_final', 'nibbin', rollRon('seed' + i))));
  assert.ok(teams.size > 10, `only ${teams.size} distinct teams from 40 seeds`);
});

test('sizes 2/3/4 (regions 1-3 as authored), then 6; ace = counter-starter line, top level', () => {
  const sizes = { ron_1: 2, ron_2: 3, ron_3: 4, ron_4: 6, ron_5: 6, ron_6: 6, ron_final: 6 };
  for (let i = 0; i < 30; i++) for (const st of STARTERS3) for (const f of RON_ORDER) {
    const team = ronTeam(f, st, rollRon(i)), lv = RON_FIGHTS[f].levels;
    assert.equal(team.length, sizes[f], f);
    assert.deepEqual(team.map((m) => m.level), lv);
    const ace = team.at(-1);
    assert.equal(ace.level, Math.max(...lv));
    assert.ok(STARTER_LINES[{ nibbin: 'cindrip', cindrip: 'rillop', rillop: 'nibbin' }[st]].includes(ace.species), `${f} ${st} ace ${ace.species}`);
    const roots = team.map((m) => root(m.species));
    assert.equal(new Set(roots).size, roots.length, `repeat in ${f}: ${roots}`);
    for (const m of team) {
      assert.ok(reg.has(m.species) && hasArt(m.species), `${m.species} registered + art`);
      assert.equal(m.species, stageFor(root(m.species), m.level), `${m.species}@${m.level} stage`);
      if (t[m.species] && m.level >= t[m.species].level) assert.ok(!hasArt(t[m.species].to) || !reg.has(t[m.species].to), `${m.species}@${m.level} should have evolved`);
    }
  }
  assert.equal(ronTeam('ron_final', 'nibbin', rollRon(1)).at(-1).level, 69);
});

test('rolled slot k is the same lineage in every fight it is in, from its debut region pool, never a base/starter line', () => {
  for (let i = 0; i < 30; i++) {
    const roll = rollRon('s' + i);
    assert.equal(new Set(roll.picks).size, 3);
    roll.picks.forEach((p, k) => assert.ok(RON_POOLS[debutFight(k)].includes(p), `${p} in ${debutFight(k)} pool`));
    for (const p of roll.picks) assert.ok(!['peeplark', 'sailquill', ...Object.values(STARTER_LINES).flat()].includes(p));
    for (const f of RON_ORDER) {
      const team = ronTeam(f, 'cindrip', roll), rolled = team.slice(2, -1).map((m) => root(m.species));
      assert.deepEqual(rolled, roll.picks.slice(0, rolled.length), f);
      const base = [team[0], ...(team.length > 2 ? [team[1]] : [])].map((m) => root(m.species));
      assert.deepEqual(base, ['peeplark', 'sailquill'].slice(0, base.length));
    }
  }
});

test('save: new game rolls once; reload keeps it; old save without a roll rolls on load (stable)', () => {
  const s = freshSave();
  assert.ok(normRonRoll(s.ron_roll));
  const back = normalise(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(back.ron_roll, s.ron_roll);
  const old = JSON.parse(JSON.stringify(s)); delete old.ron_roll;
  const m1 = normalise(JSON.parse(JSON.stringify(old))), m2 = normalise(JSON.parse(JSON.stringify(old)));
  assert.ok(normRonRoll(m1.ron_roll));
  assert.deepEqual(m1.ron_roll, m2.ron_roll);
  assert.deepEqual(ensureRonRoll({ saveId: s.saveId }), rollRon(s.saveId));
  const bad = { ...s, ron_roll: { seed: 1, picks: ['a', 'a', 'b'] } };
  assert.deepEqual(normalise(JSON.parse(JSON.stringify(bad))).ron_roll, rollRon(s.saveId));
});

test('authoredTeam routes every Ron fight (incl. Ron 6 map and final) through ronTeam', () => {
  for (const [map, id, n] of [['fernwick', 'ron_rival_1', 2], ['saltmere', 'saltmere_ron_2', 3], ['revival_heights', 'revival_heights_ron_3', 4], ['frostspire_pass', 'frostspire_pass_ron_4', 6], ['tidewater_coast', 'tidewater_coast_ron_5', 6], ['aurelith', 'aurelith_ron_6', 6], ['aurelith_arena_int', 'aurelith_arena_ron_final', 6]]) {
    const team = authoredTeam({ map, id }, [{ species: 'rillop', origin: { how: 'starter' } }]);
    assert.equal(team.length, n, id);
    assert.ok(['nibbin', 'gnawford'].includes(team.at(-1).species), id);
  }
});

test('heal after the last tower battle sets tower_healed once; not before, not after final Ron', async () => {
  const { markTowerHeal } = await import('../src/systems/heal.js');
  const { RON_FINAL } = await import('../src/battle/data/ron_team.js');
  const [done, healed] = RON_FINAL.requires;
  const sc = (f) => ({ flags: new Set(f) });
  let s = sc([]); markTowerHeal(s); assert.ok(!s.flags.has(healed));
  s = sc([done]); markTowerHeal(s); assert.ok(s.flags.has(healed));
  s = sc([done, RON_FINAL.winFlag]); markTowerHeal(s); assert.ok(!s.flags.has(healed));
});

test('beating final Ron sets beat_n_ron_7 and ron_final_beaten', async () => {
  const { trainerOutcome } = await import('../src/battle/story.js');
  const o = trainerOutcome('aurelith_arena_int', 'aurelith_arena_ron_final', true);
  assert.ok(o.flags.includes('beat_n_ron_7') && o.flags.includes('ron_final_beaten'));
  assert.ok(!trainerOutcome('aurelith_arena_int', 'aurelith_arena_ron_final', false).flags.includes('beat_n_ron_7'));
});
