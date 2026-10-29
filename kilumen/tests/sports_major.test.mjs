import test from 'node:test'; import assert from 'node:assert/strict';
import { tug, teamStrength, quirkFor, QUIRKS } from '../src/sports/tug.js';
import { MAJOR, isMajorDay, majorDaysUntil, canEnterMajor, payMajor, roundsFor, majorField, scoreRound, standings, settleMajor, townsWon } from '../src/sports/major.js';
import { rivalsFor } from '../src/sports/town_cup.js';
import { TS } from '../src/sports/town_strings.js';
const wallet = (coins) => ({ coins, spend(n) { if (this.coins < n) return false; this.coins -= n; return true; }, add(n) { this.coins += n; return n; } });
const run = (S, pol) => { const s = tug.create('t', null, 3, [0, 1, 2].map(() => ({ power: S, stamina: S })), 0.6); let t = 0; while (!s.done) { t += 1 / 60; tug.step(s, 1 / 60, pol(s, t)); } return s; };
const beat = (s) => ({ tap: s.pulse > 0.84 && s.pulse < 0.84 + 1 / 60 / 0.62, hold: { down: !!(s.surge && s.surge.warn < 0.3) } });
const mash = (s, t) => ({ tap: Math.floor(t * 10) !== Math.floor((t - 1 / 60) * 10) });
test('tug: team strength from power/stamina of three; quirks stable', () => {
  assert.ok(teamStrength([{ power: 90, stamina: 90 }]) > teamStrength([{ power: 30, stamina: 30 }]));
  assert.equal(quirkFor('frostlop', 0), quirkFor('frostlop', 0)); assert.ok(QUIRKS.includes(quirkFor('capling', 2)));
});
test('tug: idle loses, rhythm + brace beats mashing, strength matters', () => {
  assert.equal(run(60, () => ({})).lost, true);
  const b = run(60, beat), m = run(60, mash); assert.equal(b.won, true); assert.ok(b.score > m.score, `beat ${b.score} > mash ${m.score}`);
  assert.ok(run(85, beat).score >= run(30, beat).score);
});
test('tug runs in the town cup framework', () => { const r = rivalsFor(tug, 2); assert.equal(r.length, 3); for (const x of r) assert.ok(x.score >= 0); });
test('major: schedule every 9 days, locked until 4 town cups, fee + one entry', () => {
  const days = [...Array(27).keys()].filter(isMajorDay); assert.deepEqual(days, [4, 13, 22]); assert.equal(majorDaysUntil(5), 8);
  const ss = { town: { garden_hop: { cups: 1 }, tide_run: { cups: 2 }, ice_slide: { cups: 1 } } };
  assert.equal(canEnterMajor({ day: 4, coins: 9999, sstate: ss }).reason, 'locked'); assert.equal(townsWon(ss), 3);
  ss.town.forge_push = { cups: 1 }; assert.equal(canEnterMajor({ day: 5, coins: 9999, sstate: ss }).reason, 'not_today');
  assert.equal(canEnterMajor({ day: 4, coins: 499, sstate: ss }).reason, 'gold');
  const w = wallet(800); assert.equal(payMajor({ day: 4, wallet: w, sstate: ss }), true); assert.equal(w.coins, 300);
  assert.equal(canEnterMajor({ day: 4, coins: 9999, sstate: ss }).reason, 'entered'); assert.equal(canEnterMajor({ day: 13, coins: 9999, sstate: ss }).ok, true);
});
test('major: 3 distinct seeded rounds, 3 rivals, points 10/6/4/2, ties to rivals, prize + badge count', () => {
  const r = roundsFor(4); assert.equal(r.length, 3); assert.equal(new Set(r).size, 3); assert.deepEqual(roundsFor(4), r);
  const f = majorField(4, r); assert.equal(f.length, 3); f.forEach((x) => assert.equal(x.scores.length, 3));
  const row = scoreRound(0, f[0].scores[0], f); assert.equal(row.find((x) => x.me).pts < 10 || f.some((x) => x.scores[0] > f[0].scores[0]), true);
  assert.deepEqual(row.map((x) => x.pts), MAJOR.points);
  const ss = {}, w = wallet(0), res = settleMajor({ myScores: r.map((_, i) => 999), field: f, wallet: w, sstate: ss, mult: 1 });
  assert.equal(res.place, 1); assert.equal(w.coins, 3000); assert.equal(ss.major.wins, 1); assert.equal(standings([999, 999, 999], f)[0].pts, 30);
  assert.equal(settleMajor({ myScores: [0, 0, 0], field: f, wallet: wallet(0), sstate: ss }).place, 4);
});
test('new placeholder text: no blocked words', () => {
  const all = JSON.stringify([TS.major, TS.tug_of_war, TS.tug_crew, TS.tug_q_grunter, TS.tug_q_showoff, TS.tug_q_steady, TS.tug_q_nervous, TS.major_cheer, TS.major_oops, TS.major_final, TS.pop_heave, TS.pop_dig_in]);
  for (const re of [/\bPP\b/, /shiny/i, /super effective/i, /pok[eé]dex/i, /pok[eé] ?ball/i, /\bnurse\b/i, /\bweed/i, /\broute\b/i, /berr(y|ies)/i, /\bthrow/i]) assert.ok(!re.test(all), 'blocked: ' + re);
});
