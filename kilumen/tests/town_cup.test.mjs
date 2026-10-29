import test from 'node:test'; import assert from 'node:assert/strict';
import { EVENTS } from '../src/sports/town_events.js';
import { CUP, isCupDay, cupDaysUntil, canEnterCup, payCup, rivalsFor, settleCup, cupWindow } from '../src/sports/town_cup.js';
import { ACH_DEFS } from '../src/achievements/defs.js';
import { sync } from '../src/achievements/engine.js';
import { TS } from '../src/sports/town_strings.js';
const wallet = (coins) => ({ coins, spend(n) { if (this.coins < n) return false; this.coins -= n; return true; }, add(n) { this.coins += n; return n; } });

test('every town cup runs every 3 days, staggered, and some cup is on every day', () => {
  for (const ev of EVENTS) { const on = [...Array(9).keys()].filter((d) => isCupDay(ev, d)); assert.equal(on.length, 3); assert.equal(on[1] - on[0], CUP.everyDays);
    for (let d = 0; d < 9; d++) assert.ok(isCupDay(ev, d + cupDaysUntil(ev, d))); }
  for (let d = 0; d < 3; d++) assert.ok(EVENTS.some((e) => isCupDay(e, d)));
});
test('entry: fee, one per window, refused off-day or without gold', () => {
  const ev = EVENTS[0], ss = {}; let d = 0; while (!isCupDay(ev, d)) d++;
  assert.equal(canEnterCup({ ev, day: d + 1, coins: 999, sstate: ss }).reason, 'not_today');
  assert.equal(canEnterCup({ ev, day: d, coins: 10, sstate: ss }).reason, 'gold');
  const w = wallet(500); assert.ok(payCup({ ev, day: d, wallet: w, sstate: ss })); assert.equal(w.coins, 500 - CUP.fee);
  assert.equal(canEnterCup({ ev, day: d, coins: 999, sstate: ss }).reason, 'entered');
  assert.ok(canEnterCup({ ev, day: d + 3, coins: 999, sstate: ss }).ok); assert.notEqual(cupWindow(ev, d), cupWindow(ev, d + 3));
});
test('rivals are deterministic per window, within the event bars; winning pays and unlocks the badge', () => {
  for (const ev of EVENTS) { const a = rivalsFor(ev, 3), b = rivalsFor(ev, 3); assert.deepEqual(a, b); assert.equal(a.length, 3);
    for (const r of a) assert.ok(r.score >= 0 && r.score <= ev.bars[0] * 1.3, ev.id + ' ' + r.score); }
  const ev = EVENTS[4], ss = {}, w = wallet(0), riv = rivalsFor(ev, 0);
  const lose = settleCup({ ev, score: Math.max(...riv.map((r) => r.score)), rivals: riv, wallet: w, sstate: ss }); assert.notEqual(lose.place, 1); assert.equal(w.coins, 0);
  const win = settleCup({ ev, score: 999, rivals: riv, wallet: w, sstate: ss }); assert.equal(win.place, 1); assert.equal(w.coins, CUP.prize); assert.equal(win.cups, 1);
  const holder = {}, up = sync(ACH_DEFS, holder, { sports: ss, flags: new Set() }); assert.ok(up.includes('event_' + ev.id));
});
test('no sports badge is coming soon any more (Aurelith major live on dev/sports-major); cup text has no blocked words', () => {
  assert.deepEqual(ACH_DEFS.filter((d) => d.comingSoon).map((d) => d.id), []);
  const all = JSON.stringify(TS); for (const re of [/\bPP\b/, /shiny/i, /super effective/i, /pok[eé]/i, /\bnurse\b/i, /\bweed/i, /\broute\b/i, /berr(y|ies)/i, /\bthrow/i, /tonic/i, /podium/i]) assert.ok(!re.test(all), String(re));
});
