// Overnight Oct 29 2026: difficulty modes, master healing items, Team Link Band, town practice events.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DIFFICULTIES, diffOf, getDifficulty, setDifficulty, scaleLevel, scaleFoes, masterItems, MAX_FOE_ITEMS } from '../src/systems/difficulty.js';
import { KilumenBattle } from '../src/battle/battle.js';
import { EVENTS, eventFor, scoreOf, gradeOf, recordRun, coachId } from '../src/sports/town_events.js';
import { settle } from '../src/sports/tournament.js';

test('difficulty: three modes, old saves default to normal, set/get round-trips', () => {
  assert.deepEqual(Object.keys(DIFFICULTIES).sort(), ['easy', 'hard', 'normal']);
  assert.equal(getDifficulty({}), 'normal'); assert.equal(getDifficulty(undefined), 'normal');
  const s = {}; setDifficulty(s, 'hard'); assert.equal(getDifficulty(s), 'hard');
  assert.equal(diffOf('easy').damage, 0.5); assert.equal(diffOf('hard').damage, 1.5); assert.equal(diffOf('bogus').damage, 1);
  assert.ok(diffOf('easy').money < 1 && diffOf('hard').money > 1);
});

test('difficulty: foe levels scale by the gap only, normal unchanged', () => {
  assert.equal(scaleLevel(20, 10, 'normal'), 20);
  assert.equal(scaleLevel(20, 10, 'easy'), 15); assert.ok(scaleLevel(20, 10, 'hard') > 20 && scaleLevel(20, 10, 'hard') <= 25);
  assert.equal(scaleLevel(5, 30, 'easy'), 5); // no gap: no change
  const f = [{ species: 'cindrip', level: 14 }]; assert.notEqual(scaleFoes(f, 10, 'easy')[0], f[0]); assert.equal(f[0].level, 14, 'input not mutated');
});

test('master items: M1 none, M2 3 minor, M3 2 minor + 1 major, never above 5, easy fewer, hard more', () => {
  for (const m of Object.keys(DIFFICULTIES)) assert.deepEqual(masterItems(1, m), {});
  assert.deepEqual(masterItems(2, 'normal'), { tonicsmall: 3 });
  assert.deepEqual(masterItems(3, 'normal'), { tonicsmall: 2, toniclarge: 1 });
  const tot = (b) => Object.values(b).reduce((a, x) => a + x, 0);
  for (let n = 1; n <= 9; n++) {
    for (const m of Object.keys(DIFFICULTIES)) assert.ok(tot(masterItems(n, m)) <= MAX_FOE_ITEMS, `${n} ${m}`);
    if (n > 1) { assert.ok(tot(masterItems(n, 'easy')) <= tot(masterItems(n, 'normal'))); assert.ok(tot(masterItems(n, 'hard')) >= tot(masterItems(n, 'normal'))); }
  }
  assert.equal(MAX_FOE_ITEMS, 5);
});

test('foe heals with a real item at low HP, one per turn, and the Link Band shares half XP', () => {
  const kb = new KilumenBattle({ party: [{ species: 'rillop', level: 12 }, { species: 'nibbin', level: 5, held: 'team_link_band' }], foes: [{ species: 'cindrip', level: 14 }], wild: false, seed: [1, 2, 3, 4], foeItems: { tonicsmall: 2, toniclarge: 1 } });
  for (let i = 0; i < 40 && !kb.ended; i++) kb.choose('move 1');
  const log = kb.battle.log;
  const uses = log.filter((l) => /^\|-kitem\|p2a/.test(l));
  assert.ok(uses.length >= 1 && uses.length <= 2, uses.join('\n'));
  assert.ok(uses.every((l) => /tonicsmall|toniclarge/.test(l)));
  const r = kb.result(); assert.equal(r.outcome, 'win');
  assert.ok(r.linkXp?.length === 1 && r.linkXp[0].i === 1 && r.linkXp[0].xp > 0, JSON.stringify(r.linkXp));
});

test('foe damage multiplier: easy takes less HP than hard from the same foe', () => {
  const lost = (dm) => { const kb = new KilumenBattle({ party: [{ species: 'rillop', level: 15 }], foes: [{ species: 'cindrip', level: 15 }], wild: false, seed: [5, 6, 7, 8], foeDamageMult: dm }); kb.choose('move 1'); kb.choose('move 1'); return kb.result ? kb.battle.p1.active[0].maxhp - kb.battle.p1.active[0].hp : 0; };
  assert.ok(lost(0.5) < lost(1.5), `${lost(0.5)} vs ${lost(1.5)}`);
});

test('sports tournament prize scales with the money multiplier', () => {
  const pay = (mult) => { const w = { coins: 0, add(n) { this.coins += n; }, earn(n) { this.coins += n; } }; settle({ place: 1, time: 10, wallet: w, state: { enteredWindow: 0, entries: 1, wins: 0, practice: 0, best: null }, mult }); return w.coins; };
  assert.ok(pay(0.6) < pay(1) && pay(1) < pay(1.15), `${pay(0.6)} ${pay(1)} ${pay(1.15)}`);
});

test('town events: six towns, distinct mechanics, deterministic, all finish, bests recorded', () => {
  assert.equal(EVENTS.length, 6); assert.equal(new Set(EVENTS.map((e) => e.town)).size, 6);
  assert.equal(eventFor('brookhollow'), null); assert.equal(eventFor('aurelith'), null);
  const runOnce = (ev, seed) => { const s = ev.create(seed, {}, 3); let i = 0; while (!s.done && i < 6000) { ev.step(s, 1 / 30, { tap: i % 11 === 0, up: i % 13 === 0, left: i % 23 === 0, right: i % 29 === 0, hold: { left: i % 60 < 30, right: i % 60 >= 30 } }); i++; } return s; };
  for (const ev of EVENTS) {
    const a = runOnce(ev, 'k'), b = runOnce(ev, 'k');
    assert.ok(a.done, ev.id); assert.equal(scoreOf(ev, a), scoreOf(ev, b), `${ev.id} deterministic`);
    assert.ok(['gold', 'silver', 'bronze', 'none'].includes(gradeOf(ev, a)));
    const ss = {}; const r1 = recordRun(ss, ev, a); assert.equal(ss.town[ev.id].plays, 1); assert.equal(ss.town[ev.id].best, r1.score);
    const map = JSON.parse(fs.readFileSync(`art/world/overworld/maps/${ev.town}.json`, 'utf8'));
    assert.ok(map.npcs.some((n) => n.id === coachId(ev.town) && n.kind === 'coach'), `${ev.town} coach placed`);
  }
});

test('town events: better athletics stats help', () => {
  const ev = eventFor('cindervale'), go = (p) => { const s = ev.create('same', { power: p, focus: 50 }); for (let i = 0; i < 900; i++) ev.step(s, 1 / 30, { tap: s.marker != null && Math.abs(s.marker - s.zc) < s.zone * 0.2 && i % 4 === 0 }); return scoreOf(ev, s); };
  assert.ok(go(95) > go(10));
});

test('town events + new text: no banned player words', () => {
  const txt = ['src/sports/town_strings.js', 'src/systems/difficulty.js', 'src/systems/link_band.js'].map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  for (const re of [/\bPP\b/, /shiny/i, /super effective/i, /pok[eé]/i, /gotcha/i, /\bnurse/i, /\btonic\b/i, /\bweeds?\b/i, /\broutes?\b/i, /\bthrow/i]) assert.ok(!re.test(txt.replace(/tonic(small|large)/g, '')), String(re));
});
