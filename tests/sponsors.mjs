// Sponsor drop/swap: influencer + social accounts. Swap only replaces the weakest deal with a better offer; drop removes. node tests/sponsors.mjs
import assert from 'node:assert';
import { EngineAdapter } from '../src/engine_adapter.js';
import * as On from '../src/online.js';
import * as So from '../src/social.js';
const a = new EngineAdapter({ noSave: true, fresh: true, seed: 5 }); await a.init(); a.debugSetup({ age: 25, cash: 1e6 }); const s = a.s;
// influencer
const f = On.ensureInfl ? On.ensureInfl(s) : (s.infl = s.infl || {}); f.active = true; f.followers = 1e6;
f.deals = [{ brand: 'A', pay: 1000, yrsLeft: 2 }, { brand: 'B', pay: 5000, yrsLeft: 2 }, { brand: 'C', pay: 9000, yrsLeft: 2 }, { brand: 'D', pay: 9000, yrsLeft: 2 }, { brand: 'E', pay: 9000, yrsLeft: 2 }, { brand: 'F', pay: 9000, yrsLeft: 2 }].slice(0, 8);
f.offers = [{ id: 'w', brand: 'Worse', pay: 500, yrs: 2 }, { id: 'g', brand: 'Good', pay: 20000, yrs: 2 }];
const full = On.acceptDeal(s, 'g'); if (!full.ok) { assert.ok(full.canSwap); assert.ok(!On.acceptDeal(s, 'w', true).ok, 'worse swap refused'); const r = On.acceptDeal(s, 'g', true); assert.ok(r.ok, r.msg); assert.ok(!f.deals.some((d) => d.brand === 'A') && f.deals.some((d) => d.brand === 'Good'), 'weakest replaced'); }
const n = f.deals.length; assert.ok(On.dropDeal(s, 0).ok); assert.equal(f.deals.length, n - 1);
// social
const so = So.ensure(s); const pid = Object.keys(so.accounts || {})[0] || 'chirpr'; so.accounts = so.accounts || {}; so.accounts[pid] = so.accounts[pid] || { followers: 0, deals: [] }; const acc = so.accounts[pid]; acc.followers = 1e5; acc.verified = false;
acc.deals = [{ brand: 'X', pay: 100, yrsLeft: 2 }, { brand: 'Y', pay: 200, yrsLeft: 2 }, { brand: 'Z', pay: 300, yrsLeft: 2 }];
so.offers = so.offers || {}; so.offers[pid] = [{ id: 'q', brand: 'Big', pay: 5000, yrs: 2 }, { id: 'l', brand: 'Low', pay: 50, yrs: 2 }];
assert.ok(!So.acceptOffer(s, pid, 'q').ok, 'full without swap'); assert.ok(!So.acceptOffer(s, pid, 'l', true).ok, 'worse refused');
assert.ok(So.acceptOffer(s, pid, 'q', true).ok); assert.ok(!acc.deals.some((d) => d.brand === 'X') && acc.deals.some((d) => d.brand === 'Big'));
assert.ok(So.dropDeal(s, pid, 0).ok); assert.equal(acc.deals.length, 2);
console.log('sponsors: PASS');
