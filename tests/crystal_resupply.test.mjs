// RITA crystal resupply (Oct 23 2026; Gary 2:39 / 2:40 PM CT): src/systems/crystal_resupply.js. Only after a battle.
// Run: node --test tests/crystal_resupply.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { attachCrystalResupply, checkResupply, resupplyNeeded } from '../src/systems/crystal_resupply.js';
import { OPEN } from '../src/overworld/intro.js';
import { CompanyVoice, FALLBACK } from '../src/systems/company_voice.js';

const CFG = JSON.parse(fs.readFileSync(new URL('../data/company_voice.json', import.meta.url)));

function stub({ flags = [OPEN.runStarted], crystals = 0, caught = 0, wallet = 1000 } = {}) {
  const counts = { [OPEN.crystalItem]: crystals }, emits = [];
  const party = [{ species: 'nibbin' }, ...Array.from({ length: caught }, (_, i) => ({ species: 'c' + i }))];
  const s = { flags: new Set(flags), busy: false, fade: null, dialog: { active: false }, log: [], tick: 0, counters: { [OPEN.base]: 1 },
    companyVoice: { emit: (n, c) => emits.push([n, c]) },
    systems: { wallet: { money: wallet }, party: { list: party },
      bag: { count: (id) => counts[id] || 0, add: (id, n) => { counts[id] = (counts[id] || 0) + n; } },
      applyBattleResult(res) { if (res?.bag) Object.assign(counts, res.bag); return res?.outcome || null; } },
    step() { this.tick++; } };
  attachCrystalResupply(s);
  return { s, emits, counts };
}
/** A battle: busy while it runs, applyBattleResult at its end, then the battle UI closes. */
function battle(s, res = { outcome: 'fled', bag: { [OPEN.crystalItem]: 0 } }) {
  s.busy = true; s.step(); s.systems.applyBattleResult(res); s.step(); s.busy = false;
}

test('after a battle with 0 crystals and the run incomplete: RITA line + restock to 5, no coin change, repeatable', () => {
  const { s, emits, counts } = stub({ crystals: 1 });
  battle(s);
  assert.equal(emits.length, 0, 'not while the battle is still up');
  s.step();
  assert.equal(counts[OPEN.crystalItem], 5);
  assert.deepEqual(emits.map((e) => e[0]), ['crystal_resupply']);
  assert.equal(s.systems.wallet.money, 1000, 'paycheck line is flavour only');
  s.step(); assert.equal(emits.length, 1, 'once per battle end');
  battle(s); s.step();
  assert.equal(emits.length, 2); assert.equal(counts[OPEN.crystalItem], 5);
});
test('never mid-battle, never in the overworld without a battle', () => {
  const { s, emits, counts } = stub({ crystals: 0 });
  s.step(); s.step(); assert.equal(emits.length, 0, 'overworld at 0 crystals but no battle ended');
  s.busy = true; s.systems.applyBattleResult({ outcome: 'won' }); s.step(); s.step();
  assert.equal(emits.length, 0, 'battle UI still up'); assert.equal(counts[OPEN.crystalItem], 0);
  s.busy = false; s.step(); assert.equal(emits.length, 1);
});
test('not with crystals left, not with 2 caught, not before the run, not after the run is done', () => {
  for (const o of [{ crystals: 2 }, { caught: 2 }, { flags: [] }, { flags: [OPEN.runStarted, OPEN.runDone] }]) {
    const { s, emits } = stub(o);
    battle(s, { outcome: 'fled' }); s.step();
    assert.equal(emits.length, 0, JSON.stringify(o));
  }
  const d = stub({ caught: 2 }); assert.equal(resupplyNeeded(d.s), false);
  assert.equal(checkResupply(d.s), false);
});
test('restock happens even with RITA off; the line skips the burst so first_catch is kept', () => {
  const { s, counts } = stub(); s.companyVoice = null; battle(s); s.step(); assert.equal(counts[OPEN.crystalItem], 5);
  const scene = { flags: new Set(['got_starter']), seen: {}, log: [], ms: 0, lines: {} };
  const cv = new CompanyVoice(scene, { ...CFG, maxRegion: null }, { now: () => scene.ms });
  cv.emit('first_catch', { creature: 'Nibbin' }); cv.emit('crystal_resupply', { count: 5 });
  assert.deepEqual(cv.burst.map((b) => b.name), ['first_catch']); assert.deepEqual(cv.queue.map((q) => q.name), ['crystal_resupply']);
  const pages = cv.pages('crystal_resupply', { count: 5 });
  assert.match(pages[0], /^\d{6}: /); assert.ok(CFG.events.crystal_resupply.tier === 'milestone');
});
test('fallback line is clean', () => {
  const t = FALLBACK.crystal_resupply.join(' ');
  assert.match(t, /\{employee_id\}/);
  assert.doesNotMatch(t, /TODO|\bthrow|Pok[eé]|\broutes?\b|\bPP\b|shiny|super effective|Gotcha|nurse|weed/i);
});
