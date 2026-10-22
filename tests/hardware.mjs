// Console makers: 4 major + 2 minor, share, bankruptcy, replacement. node tests/hardware.mjs
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import * as Hw from '../src/hardware.js';
import * as Market from '../src/market.js';
await E.loadData();
const ok = (m) => console.log('  ok -', m);
console.log('Console makers');
const s = E.newGame({ seed: 21, sandbox: true });
let l = Hw.list(s);
assert.equal(l.makers.length, 6); assert.equal(l.makers.filter((m) => m.tier === 'major').length, 4); assert.equal(l.makers.filter((m) => m.tier === 'minor').length, 2);
assert.equal(s.market.consoles.length, 12); assert.ok(Math.abs(Object.values(Market.consoleShares(s)).reduce((a, b) => a + b, 0) - 100) < 1);
ok('6 makers (4 major, 2 minor), 12 consoles, shares sum to 100');
let died = 0, entered = 0, minSeen = 99, maxSeen = 0; const names = new Set();
for (let y = 0; y < 60; y++) {
  const before = new Set(Hw.list(s).makers.map((m) => m.name)); Market.tickConsolesYear(s); l = Hw.list(s);
  for (const m of l.makers) { if (!before.has(m.name)) entered++; names.add(m.name); }
  died = s.hw.dead.length; minSeen = Math.min(minSeen, l.makers.length); maxSeen = Math.max(maxSeen, l.makers.length);
  assert.equal(s.market.consoles.length, l.makers.length * 2, 'two consoles per maker');
  assert.ok(Math.abs(Object.values(Market.consoleShares(s)).reduce((a, b) => a + b, 0) - 100) < 1.5);
  assert.ok(l.makers.filter((m) => m.tier === 'major').length === Math.min(4, l.makers.length));
  for (const c of s.market.consoles) assert.ok(Hw.productDef(c.id).name, 'named');
}
assert.ok(died >= 2, 'makers go bankrupt over 60 years: ' + died); assert.ok(entered >= 2, 'challengers enter: ' + entered); assert.ok(minSeen >= 4 && maxSeen <= 6, `maker count stays 4-6 (${minSeen}-${maxSeen})`);
ok(`60 years: ${died} bankruptcies, ${entered} entrants, makers ${minSeen}-${maxSeen}, ${names.size} distinct makers`);
const a = JSON.parse(JSON.stringify(s)); Hw.ensure(a); assert.equal(Hw.list(a).makers.length, Hw.list(s).makers.length); ok('save round-trip');
const old = E.newGame({ seed: 5, sandbox: true }); delete old.hw; old.market.consoles = old.market.consoles.filter((c) => ['c_nova', 'c_aegis', 'c_lumen', 'c_pixie'].includes(c.id)); Hw.ensure(old); assert.equal(old.market.consoles.length, 12); ok('old four-console saves migrate');
console.log('hardware: PASS');
