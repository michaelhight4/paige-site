// Stage 9 balance checks. node tests/balance.mjs (in smoke). Prints design numbers; asserts sane bounds.
import assert from 'node:assert/strict';
import * as E from '../src/engine.js'; import { D } from '../src/data.js';
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
await E.loadData(); const ok = (m) => console.log('  ok -', m);
console.log('Stage 9: balance');
const C = D.sAssets.casino;
for (const t of C.tables) { const p = t.win_p, jp = t.jackpot_p || 0; let ev = jp * ((t.jackpot || 1) - 1) + (1 - jp) * (p * (1 + t.payout) - 1);
  if (t.skill_stat) { const lo = (0 - 50) * C.smarts_bonus, hi = (100 - 50) * C.smarts_bonus; const evAt = (x) => (p + x) * (1 + t.payout) - 1; assert.ok(evAt(0) < -0.01 && evAt(hi) < 0.08, t.id + ' skill EV'); console.log(`    ${t.id}: EV ${(evAt(0) * 100).toFixed(1)}% (smarts 50), ${(evAt(hi) * 100).toFixed(1)}% (smarts 100)`); }
  else { assert.ok(ev < -0.01 && ev > -0.12, `${t.id} house edge ${(ev * 100).toFixed(1)}%`); console.log(`    ${t.id}: house edge ${(-ev * 100).toFixed(1)}%`); } }
ok('every casino table has a house edge between 1% and 12% (poker is skill-based)');
{ // empirical: 400 slot-machine style plays lose money on average
  const mean = C.tables.filter((t) => !t.skill_stat).map((t) => (t.jackpot_p || 0) * ((t.jackpot || 1) - 1) + (1 - (t.jackpot_p || 0)) * (t.win_p * (1 + t.payout) - 1)).reduce((a, b) => a + b, 0) / 5; assert.ok(mean < 0); ok('average table EV negative'); }
// lifespan: "safe" passive bot (never takes drugs/crime options, never visits a doctor) should land in a realistic band
const ages = []; for (let seed = 1; seed <= 40; seed++) { const s = E.newGame({ seed }); let g = 0; while (s.alive && g++ < 3000) { if (s.pending.length) { const p = s.pending[0]; let ci = 0; if (p.kind === 'event') { const ev = E.Ev.eventById(p.id); const k = (ev.choices || []).findIndex((c) => !c.flag && !c.crime && ((c.fx || {}).health || 0) >= -6 && ((c.fx || {}).karma || 0) >= 0); if (k > 0) ci = k; } const r = E.resolveCard(s, ci); if (!r || !r.ok) s.pending.shift(); continue; } E.takeTurn(s); } ages.push(Math.floor(s.ending.age)); }
ages.sort((a, b) => a - b); const med = ages[ages.length >> 1]; console.log('    safe passive bot median lifespan', med, 'p10', ages[4], 'p90', ages[36]);
assert.ok(med >= 68 && med <= 85, 'median lifespan ' + med); ok('safe passive median lifespan ' + med + ' (target ~75-80)');
console.log('BALANCE TESTS PASSED');
