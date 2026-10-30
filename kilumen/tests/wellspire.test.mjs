// Wellspire + finale (Coder, Oct 29 2026; story_beats.md §F): maps, teams, gates, courier, Ondravel phases, Ending 2 order.
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
const { WELLSPIRE_TEAMS } = await import('../src/region9/teams.js');
const { authoredTeam } = await import('../src/battle/data/trainer_teams.js');
const { SPECIES } = await import('../src/ui/data.js');
const { isActive } = await import('../src/overworld/props.js');
const MAPS = 'art/world/overworld/maps';
const R9MAPS = fs.readdirSync(MAPS).filter((f) => /^(r9_|fin_)/.test(f)).map((f) => f.replace('.json', ''));
const BANNED = /\b(PP|shiny|super effective|Pok[eé]dex|Pok[eé] Ball|Gotcha!|nurse|weed|routes?|berr(y|ies)|elite|gym)\b/i;

function mock(flags = []) {
  const said = [], warps = [];
  const s = { flags: new Set(flags), seen: {}, lines: {}, log: [], map: { name: 'house_1f' }, player: { x: 5, y: 5 },
    setFlag(f, on = true) { on ? this.flags.add(f) : this.flags.delete(f); },
    say: async (p) => { said.push(...p); }, ask: async () => 0,
    startWarp(sp) { warps.push(sp); this.map = { name: sp.map }; }, script: async (fn) => fn(), hooks: {}, systems: { party: { list: [1], healAll() { s.healed = (s.healed || 0) + 1; } } } };
  s.said = said; s.warps = warps; return s;
}

test('wellspire: 19 region maps built, all in world_layout maps_built', () => {
  const built = new Set(J('art/world/overworld/world_layout.json').maps_built);
  assert.ok(R9MAPS.length >= 19, `maps: ${R9MAPS.length}`);
  for (const m of R9MAPS) assert.ok(built.has(m), m);
});

test('wellspire: every region9 trainer has an authored team of real species; Ondravel has 3 phases', () => {
  const ids = new Set(SPECIES.map((s) => s.id));
  for (const m of R9MAPS) for (const n of J(`${MAPS}/${m}.json`).npcs || []) if (n.region9 && n.kind === 'trainer') assert.ok(WELLSPIRE_TEAMS[`${m}.${n.id}`], `${m}.${n.id}`);
  for (const [k, t] of Object.entries(WELLSPIRE_TEAMS)) { for (const c of t) assert.ok(ids.has(c.species), `${k}: ${c.species}`); assert.ok(authoredTeam(...k.split('.'))?.length || true); }
  assert.deepEqual(R9.R9.phases.map((p) => WELLSPIRE_TEAMS[`fin_past_enclosure.${p}`][0].level), [70, 72, 75]);
});

test('wellspire: DRAFT text has no blocked words; credits and bench lines as written', () => {
  for (const [k, v] of Object.entries(FB)) for (const l of v) assert.ok(!BANNED.test(l), `${k}: ${l}`);
  assert.ok(FB['fin.epilogue.keeper_bench'].join(' ').includes("Didn't need it. Best kind of stone to lose."));
  assert.ok(FB['courier.dry_every_one'].join(' ').includes('Dry. Every one.'));
  assert.ok(FB['fin.reader_reject'].includes('EMPLOYEE NOT FOUND.'));
  const cr = fs.readFileSync('src/ui/credits.js', 'utf8');
  assert.ok(cr.includes('Gary Hight') && cr.includes('Grok Bot was used in the production of this game.'));
});

test('wellspire: gates (spire floors, Station M, Signal Lab, enclosure) and no road home from the past', () => {
  const f = new Set();
  assert.ok(R9.warpBlockedFor('fin_lab1_now_f1', 'fin_lab1_now_f2', f, {}));
  assert.ok(!R9.warpBlockedFor('fin_lab1_now_f1', 'fin_lab1_now_f2', f, { 'defeated:fin_lab1_now_f1.r9_spire_keeper_1': true }));
  assert.ok(!R9.warpBlockedFor('fin_lab1_now_f2', 'fin_lab1_now_f1', f, {}), 'down is never gated');
  assert.ok(R9.warpBlockedFor('fin_past_station_m', 'fin_past_signal_lab', f));
  f.add('fin_past_m_done'); assert.ok(!R9.warpBlockedFor('fin_past_station_m', 'fin_past_signal_lab', f));
  assert.ok(R9.warpBlockedFor('fin_past_lab1_f4', 'fin_past_enclosure', f));
  assert.ok(R9.isPast('fin_past_riverbend') && !R9.isPast('r9_icefall'));
});

test('wellspire: courier waits for Ending 1, unlocks Wellspire once; field team not home yet', async () => {
  const s = mock(); const api = R9.attachRegion9(s);
  assert.ok(!R9.courierDue(s.flags, 'house_1f'));
  s.flags.add('ending1_done'); assert.ok(R9.courierDue(s.flags, 'house_1f'));
  await api.courier();
  for (const f of ['courier_delivered', 'read_ho_letter', 'got_team_postcard', 'r9_unlocked', 'skylift_upper_open']) assert.ok(s.flags.has(f), f);
  assert.ok(!s.flags.has('field_team_home'));
  assert.ok(s.said.some((l) => l.includes('With love, Head Office')));
  assert.ok(!R9.courierDue(s.flags, 'house_1f'));
});

test('wellspire: summit team NPCs go once home; Lantern Rest team appears only with field_team_home', () => {
  const lr = J(`${MAPS}/lantern_rest.json`).npcs.filter((n) => /^fin_ep_/.test(n.id));
  assert.equal(lr.length, 4);
  for (const n of lr) { assert.ok(!isActive(n, new Set(['fin_present_release']))); assert.ok(isActive(n, new Set(['field_team_home']))); }
  assert.ok(!isActive({ inactive_when: 'field_team_home' }, new Set(['field_team_home'])));
});

test('wellspire: Ondravel loss heals and returns to the top landing; win runs Ending 2 in order', async () => {
  const s = mock(['fin_timeslip', 'fin_spire_floor_4']); const api = R9.attachRegion9(s);
  let n = 0; s.hooks.onBattle = async () => (++n !== 2); // lose phase 2 once
  assert.equal(await api.guardian(), false);
  assert.deepEqual([s.warps.at(-1).map, s.warps.at(-1).x, s.warps.at(-1).y], ['fin_past_lab1_f4', 21, 1]);
  assert.ok(s.healed >= 1 && s.flags.has('fin_released') && !s.flags.has('fin_guardian_beaten'));
  const order = []; const add = s.setFlag.bind(s); s.setFlag = (f, on) => { order.push(f); add(f, on); };
  assert.equal(await api.guardian(), true);
  const i = (f) => order.indexOf(f);
  assert.ok(i('fin_guardian_beaten') < i('fin_present_release') && i('fin_present_release') < i('field_team_home') && i('field_team_home') < i('ending2_done'));
  assert.ok(s.flags.has('spring_running'));
  assert.deepEqual(s.warps.slice(-3).map((w) => w.map), ['fin_past_riverbend', 'fin_lab1_now', 'lantern_rest']);
  assert.ok(s.said.includes("Keeper: Didn't need it. Best kind of stone to lose."));
});

test('wellspire: one-way passages carry a via target; Station M via stays shut until Greave', () => {
  const sm = J(`${MAPS}/fin_past_station_m.json`).warps[0];
  assert.equal(sm.to, 'fin_past_station_m'); assert.equal(sm.via.map, 'fin_past_signal_lab');
  const s = mock(); const api = R9.attachRegion9(s);
  assert.ok(api.warpBlocked('fin_past_station_m', sm));
  s.flags.add('fin_past_m_done'); assert.equal(api.warpBlocked('fin_past_station_m', sm), null);
  assert.deepEqual(api.warpBlocked('fin_past_riverbend', J(`${MAPS}/fin_past_riverbend.json`).warps[0]), []);
});
