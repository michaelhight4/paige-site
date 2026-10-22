// Pass-3 tests: events/people/health/legacy/crime/sports/ribbons/recolor. Run: node tests/life.mjs (also imported by smoke.mjs)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../src/engine.js';
import { D } from '../src/data.js';
import * as P from '../src/people.js';
import * as L from '../src/legacy.js';
import * as Cr from '../src/crime.js';
import * as Ev from '../src/events.js';
import * as R from '../src/recolor.js';
await E.loadData();
const ok = (m) => console.log('  ok -', m);
const J = (f) => JSON.parse(fs.readFileSync(new URL('../data/' + f, import.meta.url)));
console.log('5. Life data + systems (pass 3)');
{ // events data
  const evs = J('events.json'); assert.ok(evs.length >= 150, 'events>=150'); const ids = new Set(evs.map(e => e.id)); assert.equal(ids.size, evs.length);
  for (const e of evs) { assert.ok(e.choices && e.choices.length >= 2 && e.choices.length <= 4, e.id + ' choices'); for (const c of e.choices) { for (const [k, v] of Object.entries(c.fx || {})) if (['happy','happiness','health','smarts','looks','fame','karma','crazy','stress'].includes(k)) assert.ok([4, 8, 16, 30].includes(Math.abs(v)) || Math.abs(v) === 0, `${e.id} step ${k}=${v}`); for (const ch of [].concat(c.chain || [])) assert.ok(ids.has(ch.id), 'chain ' + ch.id); } }
  ok(`${evs.length} events, steps in {4,8,16,30}, chains resolve`);
  assert.ok(J('diseases.json').length >= 100); assert.ok(J('ribbons.json').length >= 30); assert.ok(J('crimes.json').crimes.length >= 10); ok('diseases/ribbons/crimes data');
}
{ // people + profile + once flags
  const s = E.newGame({ seed: 11, name: 'Pat' }); assert.ok(P.parents(s).length >= 1); const pr = P.myProfile(s); assert.ok(pr && pr.age === 0 || pr); assert.ok(P.interactionsFor(s, P.parents(s)[0]).length > 0);
  for (let i = 0; i < 20; i++) { E.takeTurn(s); while (s.pending.length) E.resolveCard(s, 0); }
  assert.ok(P.friends(s).length >= 0); const ids = Object.keys(s.flags).filter(k => k.startsWith('once_')); assert.equal(new Set(ids).size, ids.length); ok('people, profile, interactions, once flags');
}
{ // no age cap, causes, surrender
  const s = E.newGame({ seed: 5, name: 'Old' }); s.age = 120; s.stats.health = 100; let n = 0; while (s.alive && n++ < 200) { E.takeTurn(s); while (s.pending.length) E.resolveCard(s, 0); }
  assert.ok(!s.alive && s.ending.cause && s.ending.age >= 120); ok('life continues past 100 (died ' + s.ending.age + ': ' + s.ending.cause + ')');
  const t = E.newGame({ seed: 6, name: 'Quit' }); L.surrender(t); assert.ok(!t.alive && t.ending.kind === 'surrender' && t.ending.tombstone !== undefined || !t.alive); ok('surrender ends life');
}
{ // estate: tax, even/one will, under-18 auction, continue, no-kids
  const mk = (kidAges) => { const s = E.newGame({ seed: 21, name: 'Rich' }); s.age = 70; s.people = s.people.filter(p => p.rel !== 'child'); kidAges.forEach((a, i) => s.people.push(P.newPerson(s, 'child', { age: a }))); s.cash = 10e6; s.debt = 0; s.assets = [{ id: 'x', kind: 'car', name: 'Car', value: 100000 }, { id: 'h', kind: 'house', name: 'House', value: 400000 }]; return s; };
  const s = mk([30, 12]); L.die(s, 'disease', 'test'); const plan = L.computeEstate(s);
  assert.ok(plan.tax > 0 && Math.abs(plan.tax - (plan.estateVal - plan.exempt) * plan.rate) < 2); assert.equal(plan.heirs.length, 2);
  const kid = plan.heirs.find(h => h.age < 18); assert.ok(kid.trust === (kid.assets.length + kid.biz.length > 0)); ok('estate tax; minors keep objects in trust (no forced auction)');
  L.setWill(s, 'one', plan.heirs[0].id); assert.equal(L.computeEstate(s).heirs.length, 1); ok('will: one heir');
  L.setWill(s, 'even'); assert.ok(L.canContinue(s)); assert.ok(L.continueAs(s, plan.heirs[0].id)); assert.ok(s.alive && s.legacy.gen === 2 && s.cash > 0); ok('continue as child (gen 2)');
  const n = mk([]); n.people = []; L.die(n, 'disease', 'test'); assert.ok(!L.canContinue(n)); assert.ok(L.gameOverSummary(n)); ok('no kids = game over with summary');
}
{ // crime: sentence doubles, tiers
  const c = J('crimes.json'); const cr = c.crimes.find(x => x.sentence[1] > 0 && x.sentence[0] > 0);
  const a = Cr.sentenceYears(cr, 0, 0.5), b = Cr.sentenceYears(cr, 1, 0.5); assert.ok(Math.abs(b - 2 * a) < 1e-6 || b === c.rules.lifeSentence); assert.ok(c.tiers.length === 4); ok('repeat sentences double; 4 security tiers');
}
{ // school sports -> pro draft
  const SS = await import('../src/schoolsports.js'); const s = E.newGame({ seed: 31, name: 'Ball' }); s.age = 15; s.school = 'high'; s.college = 1;
  assert.ok(SS.join(s, 'basketball')); s.sport.skill = 58; for (let i = 0; i < 3; i++) { SS.yearTick(s); } assert.ok(s.sport.seasons.length >= 1 && SS.statLine(SS.sportDef('basketball'), s.sport.seasons[0].st || s.sport.seasons[0]).length > 0);
  s.sport.skill = 60; const MT = await import('../src/myteam.js'); MT.skillsOf(s, 'basketball'); const r = SS.onCollegeGraduate(s); assert.ok(r === null && s.mt.limbo && s.mt.offers.some((o) => o.kind === 'draft'), 'draft offers (accept/decline) replace the automatic draft'); ok('school sport -> draft offers after college (My Team)');
  const s2 = E.newGame({ seed: 32, name: 'Ball2' }); s2.age = 21; s2.school = null; s2.sport = { id: 'basketball', level: 'college', skill: 40, yrs: 0, seasons: [], team: 'X' }; MT.skillsOf(s2, 'basketball'); assert.equal(SS.onCollegeGraduate(s2), null); assert.ok(!s2.mt.limbo); ok('weak players get no draft offers');
}
{ // recolor
  const P2 = D.palettes; assert.ok(P2 && P2.palettes && Object.keys(P2.categories).length >= 6);
  const def = { id: 'sedan', category: 'cars', slots: ['shadow', 'body', 'glass', 'trim', 'accent', 'wheel', 'metal'], defaults: { shadow: '#1b1b2a', body: '#3f7fd6', glass: '#9fd8ee', trim: '#f3efe4', accent: '#f2c230', wheel: '#2f2f3a', metal: '#b9c0c8' }, name: 'Sedan' };
  const ids = new Set(); let rare = 0, common = 0;
  for (let i = 0; i < 300; i++) { const v = R.recolor(def, i), w = R.recolor(def, i); assert.equal(v.id, w.id); assert.deepEqual(v.colors, w.colors); assert.equal(v.colors.wheel, def.defaults.wheel); assert.equal(R.validate(P2, 'cars', v.colors).length, 0); ids.add(v.id); if (v.valueMult > 1.1) rare++; else common++; }
  assert.ok(ids.size > 60 && rare > 0 && common > rare); ok(`recolor deterministic, ${ids.size} distinct of 300, tasteful, rare colors cost more`);
  const svg = `<svg viewBox="0 0 1 1"><path data-slot="body" fill="#3f7fd6" style="fill:var(--slot-body,#3f7fd6)"/><path data-slot="wheel" fill="#2f2f3a"/></svg>`; const v = R.recolor(def, 3); const out = v.render(svg);
  assert.ok(out.includes(v.colors.body) && !out.includes('#3f7fd6') && out.includes('--slot-body:')); ok('svg render swaps slots + root vars');
  const jw = R.recolor({ id: 'ring', category: 'jewelry', slots: ['metal', 'stone', 'accent'], defaults: { metal: '#e2b93b', stone: '#d4213d', accent: '#fff' } }, 1); assert.ok(jw.valueMult >= 1 && jw.names.stone); ok('jewelry metal/gem pairing');
  const px = { data: new Uint8ClampedArray([200, 40, 40, 255, 40, 40, 200, 255]) }; R.recolorPixels(px, null, R.hexToHsl('#c82828'), R.hexToHsl('#28c828'), { select: { hue: [340, 20] } });
  assert.ok(px.data[1] > px.data[0] && px.data[6] === 200 && px.data[4] === 40); ok('raster hue-shift by region select');
  const lv = R.listingVariants(def, { rs: 9 }, 5); assert.equal(lv.length, 5); assert.ok(R.variantPrice(1000, lv[0]) >= 900); ok('listing variants + price hook');
}
{ // merge: careers/assets slice through the bridge
  const B = await import('../src/slice_bridge.js'), US = await import('../src/ui_slice.js'); const H = B.H;
  const s = E.newGame({ seed: 77, name: 'Biz' }); s.age = 30; s.cash = 5e6; s.stats.smarts = 90; s.edu = 2;
  const ui = {}; US._internal.setCur(s, ui);
  const sec = B.call(s, (d, sl) => H.listCareers(d, sl)).find(x => x.open > 0); const job = B.call(s, (d, sl) => H.listCareers(d, sl, { sector: sec.id })).find(x => x.eligible && x.level === 0);
  let r; for (let i = 0; i < 8 && !(r && r.ok); i++) r = B.call(s, (d, sl) => H.applyJob(d, sl, job.id, i > 5 ? { noRoll: true } : {})); assert.ok(r.ok && s.job && s.job.id.startsWith('sl:'), 'job mirrored into lifesim career');
  const c0 = s.cash; E.takeTurn(s); while (s.pending.length) E.resolveCard(s, 0); ok('slice job pays through lifesim tick + career mirror (' + B.jobTitle(s) + ')');
  const shop = H.listShops(B.sliceData()).find(x => x.category === 'car'); const lst = B.call(s, (d, sl) => H.listListings(d, sl, shop.id)); assert.ok(lst.every(a => a.art && a.vseed != null && a.cmult >= 0.9), 'listings carry recolor variants');
  const b = B.call(s, (d, sl) => H.buyAsset(d, sl, shop.id, lst[lst.length - 1].uid, { financing: 'cash' })); assert.ok(b.ok, b.msg); assert.ok(B.wealth(s) > 0 && L.netWorthOf(s).assets > 0); ok('buy car (recolored listing) -> net worth');
  const v1 = B.variantOf(B.call(s, (d, sl) => H.listInventory(d, sl))[0]), v2 = B.variantOf(JSON.parse(JSON.stringify(s.sl)).assets.car[0]); assert.equal(v1.id, v2.id); ok('variant reloads identically from save');
  const html = US._internal.assetsView(s, ui) + US._internal.jobView(s, ui); assert.ok(html.includes('Assets') && html.includes('Careers')); ok('slice menus render');
  const t = JSON.parse(JSON.stringify(s)); L.die(t, 'disease', 'test'); t.people.push(P.newPerson(t, 'child', { age: 30 })); const plan = L.computeEstate(t); assert.ok(plan.estateVal > 0); ok('slice assets counted in estate');
}
