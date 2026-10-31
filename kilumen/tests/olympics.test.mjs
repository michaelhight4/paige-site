import test from 'node:test'; import assert from 'node:assert/strict';
import { OLY, VENUES, OLY_EVENTS, rankEvent, standingsOf, runOlympics, autoAssign, assignTap, validAssign, olyRivals, canEnterOly, doorOpen, settleOlympics, wonFlag, eventScore, TOWN_VENUES } from '../src/sports/olympics.js';
import { OS } from '../src/sports/olympics_strings.js';
const wallet = (coins) => ({ coins, add(n) { this.coins += n; return n; } });
const K = (s) => ({ species: 'capling', level: 20, stats: { speed: s, power: s, stamina: s, agility: s, focus: s } });

test('points: 1st 3, 2nd 2, 3rd 1, 4th 0', () => {
  const r = rankEvent([{ who: 'a', score: 10 }, { who: 'me', score: 30 }, { who: 'b', score: 20 }, { who: 'c', score: 5 }]);
  assert.deepEqual(r.map((x) => [x.who, x.place, x.pts]), [['me', 1, 3], ['b', 2, 2], ['a', 3, 1], ['c', 4, 0]]);
  assert.deepEqual(OLY.points, [3, 2, 1, 0]);
});
test('event tie shares the better place; final tie: firsts, then summed score, then rival ahead of player', () => {
  const r = rankEvent([{ who: 'me', score: 20 }, { who: 'a', score: 20 }, { who: 'b', score: 10 }, { who: 'c', score: 5 }]);
  assert.deepEqual(r.map((x) => [x.who, x.place, x.pts]), [['a', 1, 3], ['me', 1, 3], ['b', 3, 1], ['c', 4, 0]]);
  assert.deepEqual(standingsOf([{ who: 'me', pts: 6, firsts: 2, sum: 1 }, { who: 'a', pts: 6, firsts: 1, sum: 99 }]).map((x) => x.who), ['me', 'a']);
  assert.deepEqual(standingsOf([{ who: 'me', pts: 6, firsts: 1, sum: 50 }, { who: 'a', pts: 6, firsts: 1, sum: 40 }]).map((x) => x.who), ['me', 'a']);
  assert.deepEqual(standingsOf([{ who: 'me', pts: 6, firsts: 1, sum: 50 }, { who: 'a', pts: 6, firsts: 1, sum: 50 }]).map((x) => x.who), ['a', 'me']);
});
test('assignment: three different Kilu, tap swaps, AI picks the best fit per event', () => {
  assert.ok(validAssign([0, 1, 2], 3)); assert.ok(!validAssign([0, 0, 2], 3)); assert.ok(!validAssign([0, 1, 3], 3)); assert.ok(!validAssign([0, 1], 3));
  assert.deepEqual(assignTap([0, 1, 2], 0, 2), [2, 1, 0]); assert.deepEqual(assignTap([0, 1, 2], 1, 3), [0, 3, 2]);
  const kilu = [{ stats: { speed: 90, stamina: 50, power: 10, focus: 10, agility: 10 } }, { stats: { power: 95, stamina: 50, speed: 10, focus: 10, agility: 10 } }, { stats: { stamina: 95, focus: 60, speed: 20, power: 20, agility: 10 } }];
  assert.deepEqual(autoAssign(['sprint', 'lift', 'marathon'], kilu), [0, 1, 2]);
  for (const v of Object.keys(VENUES)) { assert.equal(VENUES[v].length, 3); for (const r of olyRivals(v, 4, 20)) assert.ok(validAssign(r.assign, r.kilu.length)); }
  assert.deepEqual(olyRivals('fernwick', 7, 20), olyRivals('fernwick', 7, 20));
});
test('a full competition is deterministic, has 3 ranked events and totals add up', () => {
  const ents = [{ who: 'me', name: 'You', kilu: [K(90), K(90), K(90)], assign: [0, 1, 2] }, ...olyRivals('saltmere', 3, 20).map((r, i) => ({ who: 'r' + i, name: r.trainer, kilu: r.kilu, assign: r.assign }))];
  const a = runOlympics({ venue: 'saltmere', day: 3, entrants: ents }), b = runOlympics({ venue: 'saltmere', day: 3, entrants: ents });
  assert.deepEqual(a, b); assert.equal(a.events.length, 3);
  for (const x of a.table) assert.equal(x.pts, a.events.reduce((s, e) => s + e.rows.find((r) => r.who === x.who).pts, 0));
  assert.equal(a.table[0].who, 'me', 'stat 90 Kilu beat the field');
  assert.equal(eventScore('sprint', K(50).stats, 20, 's'), eventScore('sprint', K(50).stats, 20, 's'));
});
test('doors: town Olympics needs that town hall; Aurelith needs every town title; coins never open them', () => {
  const ss = {};
  assert.equal(canEnterOly({ venue: 'fernwick', flags: new Set(['all_badges']), teamSize: 6, day: 1, sstate: ss }).reason, 'locked');
  assert.ok(canEnterOly({ venue: 'fernwick', flags: new Set(['beat_master_fernwick']), teamSize: 6, day: 1, sstate: ss }).ok);
  assert.ok(doorOpen('revival_heights', new Set(['beat_master_revival'])));
  assert.equal(canEnterOly({ venue: 'fernwick', flags: new Set(['beat_master_fernwick']), teamSize: 2, day: 1, sstate: ss }).reason, 'team');
  assert.ok(!doorOpen('aurelith', new Set(['all_badges', ...TOWN_VENUES.slice(1).map(wonFlag)])));
  assert.ok(doorOpen('aurelith', new Set(TOWN_VENUES.map(wonFlag))));
  const w = wallet(0), r = settleOlympics({ venue: 'fernwick', day: 1, table: [{ who: 'me' }, { who: 'r0' }], wallet: w, sstate: ss });
  assert.equal(r.place, 1); assert.equal(w.coins, OLY.prize.town); assert.ok(r.firstWin); assert.equal(r.flag, 'oly_won_fernwick'); assert.equal(r.merit, 15);
  assert.equal(canEnterOly({ venue: 'fernwick', flags: new Set(['beat_master_fernwick']), teamSize: 6, day: 1, sstate: ss }).reason, 'entered');
  assert.ok(!settleOlympics({ venue: 'fernwick', day: 2, table: [{ who: 'me' }], wallet: w, sstate: ss }).firstWin);
});
test('every event and venue has text; no hold/drag wording', () => {
  for (const id of Object.keys(OLY_EVENTS)) assert.ok(OS.events[id], id); for (const v of Object.keys(VENUES)) assert.ok(OS.venue[v], v);
  assert.doesNotMatch(JSON.stringify(OS), /\b(hold|drag)\b/i);
});
