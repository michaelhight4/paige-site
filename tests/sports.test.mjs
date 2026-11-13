// Kilumen sports (dev, ?sports=1): athletic stats, traits, dash race, meet. node --test tests/sports.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { SPECIES } from '../src/ui/data.js';
import { ATHLETICS } from '../src/sports/data/athletics.gen.js';
import { STATS, TRAITS, POINTS } from '../src/sports/rules.js';
import { rollAthletics, ensureAthletics, athleticStats, speciesAthletics, rollRivalAthletics } from '../src/sports/athletics.js';
import { simulate, markerQuality, startQuality } from '../src/sports/race.js';
import { pickRivals, racerFromCreature, singleEntrant, DASH } from '../src/sports/dash.js';
import { runMeet, placeResults } from '../src/sports/meet.js';
import { S } from '../src/sports/strings.js';

test('table covers every species, ranges are sane', () => {
  for (const s of SPECIES) {
    const a = ATHLETICS[s.id]; assert.ok(a, s.id);
    for (const st of STATS) { const [lo, hi] = a.ranges[st]; assert.ok(lo >= 1 && hi <= 99 && hi - lo >= 10, `${s.id}.${st} ${lo}-${hi}`); }
    for (const t of TRAITS) assert.ok(a.traitWeights[t] >= 1);
  }
});
test('generated table is up to date with rules + overrides', () => {
  execFileSync(process.execPath, ['tools/sports/gen_athletics.mjs', '--check']);
});
test('rolls stay inside the species range', () => {
  for (const s of SPECIES) for (let i = 0; i < 20; i++) {
    const c = { uid: `t${i}`, species: s.id }, v = athleticStats(c), R = speciesAthletics(s.id).ranges;
    for (const st of STATS) assert.ok(v[st] >= R[st][0] && v[st] <= R[st][1], `${s.id} ${st}`);
    assert.ok(c.ath.traits.length >= 1 && c.ath.traits.length <= 2 && new Set(c.ath.traits).size === c.ath.traits.length);
  }
});
test('deterministic from uid (lazy migration is stable), different uids differ', () => {
  const a = rollAthletics('peeplark', 'c-abc'), b = rollAthletics('peeplark', 'c-abc'), c = rollAthletics('peeplark', 'c-abd');
  assert.deepEqual(a, b); assert.notDeepEqual(a.q, c.q);
  const old = { uid: 'c-old1', species: 'tumbloam', level: 9 };
  const first = structuredClone(ensureAthletics(old)); delete old.ath;
  assert.deepEqual(ensureAthletics(old), first, 'old save re-rolls the same numbers');
  const kept = { uid: 'x', species: 'nibbin', ath: { v: 1, q: Object.fromEntries(STATS.map((s) => [s, 1])), traits: ['sprinter'] } };
  assert.equal(athleticStats(kept).speed, speciesAthletics('nibbin').ranges.speed[1], 'stored roll is respected');
});
test('species bias shows over many rolls (birds agile, blobs stamina > speed)', () => {
  const mean = (sp, st) => { let n = 0; for (let i = 0; i < 400; i++) n += athleticStats({ uid: 'm' + i, species: sp })[st]; return n / 400; };
  assert.ok(mean('galespar', 'agility') > mean('bastonox', 'agility') + 20);
  assert.ok(mean('tumbloam', 'stamina') > mean('tumbloam', 'speed') + 15);
  assert.ok(mean('foalgust', 'speed') > mean('mirewump', 'speed') + 20);
  const tr = (sp, t) => { let n = 0; for (let i = 0; i < 600; i++) n += rollAthletics(sp, 'w' + i).traits.includes(t); return n; };
  assert.ok(tr('mirewump', 'steady_pacer') > tr('foalgust', 'steady_pacer'));
  assert.ok(tr('foalgust', 'sprinter') > tr('mirewump', 'sprinter'));
});
test('rivals skew upward', () => {
  let me = 0, rv = 0; for (let i = 0; i < 300; i++) { me += rollAthletics('nibbin', 'p' + i).q.speed; rv += rollRivalAthletics('nibbin', 'p' + i).q.speed; }
  assert.ok(rv > me);
});
const R = (sp, uid, p = false) => racerFromCreature({ uid, species: sp }, p);
test('race: 20-30 s, deterministic, stats beat taps', () => {
  const field = [R('nibbin', 'a', true), R('foalgust', 'b'), R('peeplark', 'c'), R('tumbloam', 'd')];
  const r1 = simulate(field, 's'), r2 = simulate(field, 's');
  assert.deepEqual(r1.racers.map((r) => r.finish), r2.racers.map((r) => r.finish));
  for (const r of r1.racers) assert.ok(r.finish > 18 && r.finish < 32, `${r.species} ${r.finish}`);
  const best = simulate(field, 's', { start: 1, push: 1, sprint: 1 }), worst = simulate(field, 's', { start: 0, push: 0, sprint: 0 });
  const p = (race) => race.racers.find((r) => r.isPlayer).finish;
  assert.ok(p(best) < p(worst), 'inputs matter');
  assert.ok(p(worst) - p(best) < 2, 'but are worth under 2 s');
  // a slow blob with perfect taps still loses to a fast runner with no taps, most seeds
  let fastWins = 0;
  for (let i = 0; i < 30; i++) { const race = simulate([R('mirewump', 'm' + i, true), R('foalgust', 'f' + i), R('galespar', 'g' + i), R('kindlepup', 'k' + i)], 'x' + i, { start: 1, push: 1, sprint: 1 }); if (race.order[0].species !== 'mirewump') fastWins++; }
  assert.ok(fastWins >= 27);
  const fs1 = simulate(field, 's', { start: -1, push: 0.7, sprint: 0.7 });
  assert.ok(p(fs1) > p(simulate(field, 's')), 'false start costs time');
});
test('input helpers', () => {
  assert.equal(markerQuality(0.5, 0.5, 0.1), 1); assert.ok(markerQuality(0.58, 0.5, 0.1) >= 0.6); assert.equal(markerQuality(0.95, 0.5, 0.1), 0);
  assert.equal(startQuality(-0.01), -1); assert.equal(startQuality(0.1), 1); assert.equal(startQuality(2), 0);
});
test('rivals fit difficulty and are seeded', () => {
  const a = pickRivals({ species: 'nibbin' }, 7, 'z'), b = pickRivals({ species: 'nibbin' }, 7, 'z');
  assert.equal(a.length, 7); assert.deepEqual(a.map((r) => r.species), b.map((r) => r.species));
  assert.ok(!a.some((r) => r.species === 'nibbin'));
});
test('meet: 2 heats of 4 via brackets-manager, top 2 each to a final, points table', async () => {
  const me = R('nibbin', 'me', true);
  const entrants = [singleEntrant(me), ...pickRivals({ species: 'nibbin' }, 7, 'meet').map(singleEntrant)];
  const out = await runMeet('dash', entrants, (ev, field, label) => DASH.run(field, { seed: 'm' + label }));
  assert.equal(out.heats.length, 2); assert.equal(out.final.length, 4); assert.equal(out.qualified.length, 4);
  for (const h of out.heats) for (const q of out.qualified.filter((e) => h.placed.some((p) => p.entrantId === e.id))) assert.ok(h.placed.find((p) => p.entrantId === q.id).place <= 2);
  assert.deepEqual(out.final.map((r) => r.points), [POINTS[1], POINTS[2], POINTS[3], POINTS[4]]);
  assert.deepEqual(placeResults([{ entrantId: 'a', time: 3 }, { entrantId: 'b', time: 2 }]).map((r) => r.entrantId), ['b', 'a']);
});
test('player strings avoid blocked words', () => {
  const bad = /\bPP\b|shiny|super effective|pok[eé]dex|pok[eé] ?ball|gotcha|nurse|\bweed|\broutes?\b|\bthrow/i;
  for (const [k, v] of Object.entries(S)) assert.ok(!bad.test(v) && !/\btonic\b/i.test(v), `${k}: ${v}`);
});
test('vendored brackets bundle keeps its licence notices', () => {
  assert.match(fs.readFileSync('src/vendor/brackets/brackets.js', 'utf8').slice(0, 400), /MIT/);
  assert.match(fs.readFileSync('src/vendor/brackets/LICENSES.txt', 'utf8'), /Corentin Girard/);
  assert.match(fs.readFileSync('src/sports/ported.js', 'utf8'), /Saurabh Singh[\s\S]*channingbreeze/);
});

// ---- Brookhollow venue: tournament rules (Oct 28 2026) ----
import { TOURNEY, windowOf, isTourneyDay, daysUntil, sportsState, canEnter, payEntry, settle } from '../src/sports/tournament.js';
import { Wallet } from '../src/systems/shop.js';
import { serialise, deserialise } from '../src/systems/creature.js';
import { readFileSync as _rf } from 'node:fs';

test('tournament: every 3 days, next-in-N countdown', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(isTourneyDay), [true, false, false, true, false, false, true]);
  assert.deepEqual([0, 1, 2, 3].map(daysUntil), [0, 2, 1, 0]);
  assert.equal(windowOf(5), 1); assert.equal(windowOf(6), 2);
});
test('tournament: refuse under 150 gold, fee and prize via wallet, one entry per window', () => {
  const st = sportsState({}), w = new Wallet(149);
  assert.equal(canEnter({ day: 3, coins: w.coins, state: st }).reason, 'gold');
  assert.equal(payEntry({ day: 3, wallet: w, state: st }), false); assert.equal(w.coins, 149);
  w.add(1);
  assert.equal(canEnter({ day: 4, coins: w.coins, state: st }).reason, 'not_today');
  assert.equal(payEntry({ day: 3, wallet: w, state: st }), true); assert.equal(w.coins, 0);
  w.add(500);
  assert.equal(canEnter({ day: 3, coins: w.coins, state: st }).reason, 'entered');
  assert.equal(payEntry({ day: 3, wallet: w, state: st }), false); assert.equal(w.coins, 500);
  assert.equal(settle({ place: 2, time: 21.5, wallet: w, state: st }), 0); assert.equal(w.coins, 500);
  assert.ok(canEnter({ day: 6, coins: w.coins, state: st }).ok);
  payEntry({ day: 6, wallet: w, state: st });
  assert.equal(settle({ place: 1, time: 20.9, wallet: w, state: st }), TOURNEY.prize);
  assert.equal(w.coins, 500 - 150 + 1000); assert.equal(st.wins, 1); assert.equal(st.best, 20.9); assert.equal(st.entries, 2);
});
test('creature save keeps the athletics roll; old saves without it still load', () => {
  const c = deserialise({ species: 'nibbin', level: 5, uid: 'c_t1' });
  assert.equal(c.ath, undefined);
  c.ath = { v: 1, q: { speed: 0.5 }, traits: ['sprinter'] };
  const back = deserialise(JSON.parse(JSON.stringify(serialise(c))));
  assert.deepEqual(back.ath, c.ath);
});
test('venue coach is in Brookhollow on a free tile', () => {
  const m = JSON.parse(_rf(new URL('../art/world/overworld/maps/brookhollow.json', import.meta.url), 'utf8'));
  const n = m.npcs.find((x) => x.id === 'dash_coach');
  assert.ok(n); assert.equal(m.layers.collision[n.y][n.x], 0);
});

// ---- hype pass v2 (Oct 28 2026): pure helpers ----
import { persona, isPhotoFinish, liveOrder, tickValue, coachLine, monLine, idText, TIMING } from '../src/sports/hype.js';
test('hype: persona by trait, scoreboard tick, id, live order', () => {
  assert.equal(persona(['fast_starter']), 'hop'); assert.equal(persona(['sprinter']), 'proud'); assert.equal(persona([]), 'stretch');
  assert.equal(tickValue(10, 12, 0), 0); assert.equal(tickValue(10, 12, TIMING.board), 10); assert.ok(Math.abs(tickValue(12, 12, TIMING.board / 2) - 6) < 1e-9);
  assert.equal(idText(42), '00042'); assert.equal(idText(123456), '23456');
  const race = { racers: [{ x: 50, done: false }, { x: 80, done: false }, { finish: 9, done: true }, { finish: 8, done: true }] };
  assert.deepEqual(liveOrder(race).map((r) => r.finish ?? r.x), [8, 9, 80, 50]);
});
test('hype: photo finish only when the top two are close', () => {
  const lead = { done: true, finish: 10 };
  assert.ok(isPhotoFinish({ order: [lead], racers: [lead, { done: true, finish: 10.1 }] }));
  assert.ok(!isPhotoFinish({ order: [lead], racers: [lead, { done: true, finish: 10.6 }] }));
  assert.ok(!isPhotoFinish({ order: [], racers: [] }));
});
test('hype: coach + creature context lines', () => {
  assert.match(coachLine({ place: 1, underdog: true, name: 'Nib' }), /Nib/);
  assert.match(coachLine({ place: 2, rematch: { name: 'Ro', won: false } }), /Ro/);
  assert.match(coachLine({ place: 3, newBest: true, time: 12.345 }), /12\.35/);
  assert.equal(coachLine({ place: 4 }), S.coach_lose);
  assert.match(monLine(1, 'Nib'), /Nib/);
  for (const k of ['final_stretch', 'finish', 'new_record', 'champ_title', 'champ_congrats', 'champ_gold']) assert.ok(S[k], k);
});
