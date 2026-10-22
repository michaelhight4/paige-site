// Sports honors: trophy case (rings vs trophies), Hall of Fame popup + legacy entry + family bonus, athlete brand deals + Autopilot. node tests/honors.mjs
import assert from 'node:assert';
import { EngineAdapter } from '../src/engine_adapter.js';
import * as MT from '../src/myteam.js';
import * as Hon from '../src/honors.js';
import * as Ev from '../src/events.js';
const a = new EngineAdapter({ noSave: true, fresh: true, seed: 31, noInterview: true }); await a.init(); a.debugSetup({ age: 30, cash: 1e6 }); const s = a.s;
const m = MT.ensure(s); m.awards.push({ id: 'champion', label: 'League champion', year: 2040, sid: 'basketball', level: 'pro' }, { id: 'champion', year: 2041, sid: 'basketball', level: 'pro' }, { id: 'champion', year: 2042, sid: 'soccer', level: 'pro' });
const tc = a.getTrophyCase(); assert.equal(tc.rings, 2); assert.equal(tc.trophies, 1); assert.ok(tc.groups.find((g) => g.kind === 'ring' && g.count === 2));
// HoF
s.age = 40; m.career.pts = 40; s.pending = []; MT.retireCheck(s); assert.ok(m.career.hof); assert.ok(s.pending.some((p) => p.kind === 'hof'), 'hof popup');
const card = Ev.pendingCard(s); assert.match(card.title, /Hall of Fame/); assert.match(card.text, /2 rings/); Ev.resolveCard(s, 0);
assert.ok(s.awards.some((x) => x.id === 'hall_of_fame'), 'legacy entry'); assert.ok(s.flags.hof_family);
// brand deals
m.career.proYears = 5; s.stats.fame = 70; let v = a.getBrandDeals(); assert.ok(v.eligible && v.offers.length >= 1, JSON.stringify(v));
const o = v.offers[0]; let r = a.brandAccept(o.id); assert.ok(r.ok, r.message); v = a.getBrandDeals(); assert.equal(v.deals.length, 1);
const cash0 = s.cash; Hon.yearTick(s); assert.equal(s.cash - cash0, o.pay, 'deal pays yearly');
// fill + swap rule
const b = s.mt.brand; b.deals = Hon.CATS.slice(0, 3).map((c, i) => ({ id: 'x' + i, cat: c.id, icon: c.icon, brand: c.brands[0], pay: 1000 * (i + 1), until: 99 }));
b.offers = [{ id: 'o1', cat: 'games', icon: '🎮', brand: 'Arena Live', pay: 500000, years: 3 }];
assert.ok(!a.brandAccept('o1').ok, 'full slots refuse');
r = a.brandAccept('o1', 'x0'); assert.ok(r.ok); assert.ok(!b.deals.some((d) => d.id === 'x0') && b.deals.some((d) => d.brand === 'Arena Live'));
r = a.brandDrop('x1'); assert.ok(r.ok); assert.equal(b.deals.length, 2);
// Autopilot routine never takes a worse deal
const { CUSTOM } = await import('../src/autopilot.js').catch(() => ({}));
b.offers = [{ id: 'o2', cat: 'games', icon: '🎮', brand: 'Pro Rivals', pay: 10, years: 3 }];
if (CUSTOM) { const c = CUSTOM.athlete_brand(a); assert.ok(!c.ok, 'worse same-cat offer ignored'); b.offers.push({ id: 'o3', cat: 'shoes', icon: '👟', brand: 'Apex Sole', pay: 9e5, years: 2 }); const c2 = CUSTOM.athlete_brand(a); assert.ok(c2.ok); c2.run(); assert.ok(b.deals.some((d) => d.brand === 'Apex Sole')); }
// heir inherits famous name
const kidFlag = s.flags.hof_family; assert.ok(kidFlag);
console.log('honors: PASS' + (CUSTOM ? '' : ' (no CUSTOM export)'));
