// Soul pass (v0.4.1 text + save + clock + warmth stage): pure Node tests.  node --test tests/soul.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fillText, pickLine, inboxEmails, pickNick, coinCount, whenMatches } from '../src/overworld/lines.js';
import { SaveStore, freshSave, normalise, SAVE_KEY } from '../src/overworld/save.js';
import { phaseForHour, gradeFor, advanceClock } from '../src/overworld/clock.js';
import { warmthStage } from '../src/overworld/palette.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = JSON.parse(fs.readFileSync(path.join(ROOT, 'text/overworld_lines.json'), 'utf8'));
const F = (...f) => new Set(f);

test('lines file is v0.4.1', () => assert.equal(L._meta.version, '0.4.1'));

test('first matching line wins; pending_story_call lines are skipped', () => {
  const spot = { lines: [{ id: 'p', flags: [], pending_story_call: true, pages: ['x'] }, { id: 'a', flags: ['f'], pages: ['a'] }, { id: 'default', flags: [], pages: ['d'] }] };
  assert.equal(pickLine(spot, F()).id, 'default');
  assert.equal(pickLine(spot, F('f')).id, 'a');
});

test('placeholders fill; unknown ones stay visible', () => {
  assert.equal(fillText('{player} has {coins} coins, {lead} {nick} {rt_number} {zzz}', { player: 'Cal', coins: 3, lead: 'Bubbles', nick: 'kid', rt_number: 'RT-1' }), 'Cal has 3 coins, Bubbles kid RT-1 {zzz}');
});

test('bin_ron: line follows the bin stage; empty after finale_done; creature after 8 inspects', () => {
  const bin = L.maps.brookhollow.bin_ron;
  const env = (binStage, n = 0) => ({ binStage, counters: { bin_inspects_after_8: n }, isSeen: () => false });
  assert.equal(pickLine(bin, F(), env(0)).id, 'default');
  assert.equal(pickLine(bin, F('beat_master_fernwick'), env(1)).id, 'bin_1');
  const all = F('beat_master_fernwick', 'beat_master_tidewater', 'all_badges');
  assert.equal(pickLine(bin, all, env(8)).id, 'bin_8');
  assert.equal(pickLine(bin, all, env(8, 8)).id, 'bin_creature');
  assert.equal(pickLine(bin, F('finale_done', 'all_badges'), env('empty')).id, 'bin_empty');
  assert.equal(coinCount(F('beat_master_a', 'beat_master_b', 'x')), 2);
});

test('window lines follow the phase (dawn is a phase), 3am at night hour 3', () => {
  const w = L.maps.house_1f.window_1;
  const at = (phase, hour) => pickLine(w, F(), { phase, hour }).id;
  assert.equal(at('dawn', 6), 'win_dawn');
  assert.equal(at('day', 12), 'default');
  assert.equal(pickLine(w, F('beat_master_fernwick'), { phase: 'day', hour: 12 }).id, 'win_kids');
  assert.equal(at('dusk', 18), 'win_dusk');
  assert.equal(at('night', 22), 'win_night');
  assert.equal(at('night', 3), 'win_3am');
  let n = 0;
  for (const m of Object.values(L.maps)) for (const k of Object.keys(m)) if (/^window_\d+$/.test(k)) n++;
  assert.equal(n, 9);
});

test('when: unknown keys (weekday) never match; count_gte; once', () => {
  assert.equal(whenMatches({ weekday: 'mon' }, {}), false);
  assert.equal(whenMatches({ count_gte: { counter: 'c', n: 2 } }, { counters: { c: 2 } }), true);
  assert.equal(whenMatches({ once: true }, { isSeen: () => true }), false);
});

test('company inbox: flagged emails, newest first; ron nicknames by flag', () => {
  const all = inboxEmails(L.company_inbox, F(...Object.keys(L._meta.flags || {}), 'has_run_shoes', 'has_bike', 'all_badges', 'finale_done'));
  assert.ok(inboxEmails(L.company_inbox, F()).length <= all.length);
  assert.ok(all.every((e) => e.subject && e.pages?.length));
  const nick = pickNick(L.ron_nicknames, F(), () => 0);
  assert.ok(nick === null || typeof nick === 'string');
});

test('save: round trip, backup fallback on a corrupt main save, ?save=0 = no storage', () => {
  const mem = new Map(); const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  const st = new SaveStore(storage);
  const s = freshSave(); s.flags = ['has_bike']; s.counters.office_display_taps = 3; s.party = [{ species: 'rillop', nickname: 'Bubbles', warmth: 80 }];
  assert.ok(st.save(s));
  s.flags.push('has_run_shoes'); assert.ok(st.save(s));
  assert.deepEqual(st.load().flags, ['has_bike', 'has_run_shoes']);
  mem.set(SAVE_KEY, '{broken');
  const back = st.load();
  assert.deepEqual(back.flags, ['has_bike']); assert.equal(back.counters.office_display_taps, 3); assert.equal(back.party[0].warmth, 80);
  assert.equal(new SaveStore(null).load(), null);
  assert.throws(() => normalise({ v: 99 }));
});

test('clock: phases, indoor grade, day roll; warmth stages', () => {
  assert.deepEqual([4, 5, 7, 8, 16, 17, 19, 20].map(phaseForHour), ['night', 'dawn', 'dawn', 'day', 'day', 'dusk', 'dusk', 'night']);
  assert.equal(gradeFor('house_1f', 'night'), 'day');
  assert.equal(gradeFor('heal_centre_int', 'night'), 'day');
  assert.equal(gradeFor('lantern_rest', 'night'), 'night');
  // every interior prefix stays on day (clock.INDOOR_OR_CAVE is the one list; living.js re-uses it)
  for (const m of ['heal_brookhollow', 'home_brookhollow_a', 'lab_brookhollow', 'rt_branch_backroom', 'mart_x', 'station_int', 'hall_x', 'greystone_b1']) assert.equal(gradeFor(m, 'night'), 'day', m);
  for (const m of ['brookhollow', 'fernwick', 'route1', 'thornwood', 'mirefen_bog']) assert.equal(gradeFor(m, 'night'), 'night', m);
  const c = { day: 0, min: 1439 }; assert.equal(advanceClock(c, 2), true); assert.deepEqual(c, { day: 1, min: 1 });
  assert.deepEqual([0, 24, 25, 49, 50, 74, 75, 100].map(warmthStage), [0, 0, 1, 1, 2, 2, 3, 3]);
});
