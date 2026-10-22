// One major + its sister minor per sport; other sports independent; custom clubs; migration. node tests/franchise_pairs.mjs
import assert from 'node:assert/strict';
import * as E from '../src/engine.js'; import * as Fr from '../src/franchise.js';
import { EngineAdapter } from '../src/engine_adapter.js';
await E.loadData(); const ok = (m) => console.log('  ok -', m);
const mk = async (seed = 5) => { const a = new EngineAdapter({ noSave: true, fresh: true, seed }); await a.init(); a.debugSetup({ age: 40, cash: 5e9 }); a.s.school = null; return a; };
const buy = (a, sport, id, type) => a.frAction('buy', { sport, teamId: id, type, size: 'small', tier: 'basic', preset: 'balanced' });
const D = JSON.parse((await import('node:fs')).readFileSync(new URL('../data/franchise.json', import.meta.url)));
console.log('Franchise pairs');
{ for (const [k, v] of Object.entries(D.sports)) { const names = new Set(); for (const t of v.teams) { assert.ok(t.minor && t.minor.id === t.id + '_m' && t.minor.name, 'each major has exactly one minor'); names.add(t.name); names.add(t.minor.name); } assert.equal(names.size, v.teams.length * 2, 'unique pair names in ' + k); } ok('every major in every sport has one named affiliated minor'); }
{ const a = await mk(); const cat = (sp, ty) => a.getFranchiseTeams(sp, ty);
  assert.ok(buy(a, 'soccer', 'soccer_0', 'pro').ok, 'major'); assert.equal(a.getFranchise().team.sportName.length > 0, true);
  assert.ok(!buy(a, 'soccer', 'soccer_1', 'pro').ok, 'second major blocked'); assert.ok(!buy(a, 'soccer', 'soccer_1', 'elite').ok, 'elite counts as major');
  assert.ok(!buy(a, 'soccer', 'soccer_1_m', 'semi').ok, 'another club\'s minor blocked'); const r = buy(a, 'soccer', 'soccer_1_m', 'semi'); assert.match(r.message || r.msg || '', /sister minor/);
  const minors = cat('soccer', 'semi'); assert.equal(minors.filter((x) => !x.locked).length, 1); assert.equal(minors.find((x) => !x.locked).id, 'soccer_0_m'); const majors = cat('soccer', 'pro'); assert.ok(majors.every((x) => x.locked), 'all majors locked or owned'); assert.match(majors.find((x) => x.id === 'soccer_1').locked, /only one major|One major|already own/i);
  assert.ok(buy(a, 'soccer', 'soccer_0_m', 'semi').ok, 'sister minor ok'); assert.equal(a.getFranchise().teams.length, 2); assert.ok(!buy(a, 'soccer', 'soccer_2_m', 'semi').ok, 'one minor per sport');
  assert.ok(buy(a, 'hockey', 'hockey_3', 'pro').ok, 'other sport independent'); assert.equal(a.getFranchise().teams.length, 3); ok('major locks other majors; only the sister minor is open; sports independent'); 
  const hv = a.s.fr.teams.map((t) => t.id); assert.ok(a.frAction('switch', 'soccer_0').ok); assert.equal(a.getFranchise().team.name, 'Harbor United'); assert.ok(a.frAction('switch', hv[2]).ok);
  const rec = a.getBusinesses().owned.filter((x) => x.franchise); assert.equal(rec.length, 3); assert.ok(rec.every((x) => x.teamId)); ok('team switching + one business record per team');
  for (let i = 0; i < 3; i++) { let g = 0; while (a.s.pending.length && g++ < 8) { const c = E.pendingCard(a.s), n = c ? c.choices.length : 1; let d = false; for (let k = 0; k < n && !d; k++) { const q = E.resolveCard(a.s, k); d = q && q.ok; } if (!d) a.s.pending.shift(); } a.s.stats.health = 90; a.s.diseases = []; E.takeTurn(a.s); } assert.ok(a.s.fr.teams.every((t) => t.years >= 2), 'every owned team ages each year'); ok('yearly tick runs for every owned team');
  assert.ok(a.frAction('switch', 'soccer_0').ok); assert.ok(a.frAction('sell').ok); assert.equal(a.getFranchise().teams.length, 2); assert.ok(!buy(a, 'soccer', 'soccer_4', 'pro').ok, 'minor owner is locked to its own sister major'); assert.ok(buy(a, 'soccer', 'soccer_0', 'pro').ok, 'sister major reopens'); ok('minor-first locks you to its paired major'); }
{ const a = await mk(6); const mkc = (sport, name, type) => a.frAction('create', { sport, name, type, size: 'small', tier: 'basic', look: 'modern', preset: 'balanced' });
  assert.ok(mkc('basketball', 'Zephyr Flyers', 'pro').ok); assert.ok(!mkc('basketball', 'Other Major', 'pro').ok, 'one major'); assert.ok(!buy(a, 'basketball', 'basketball_2_m', 'semi').ok, 'cannot buy another club\'s minor'); assert.ok(mkc('basketball', 'Zephyr Cubs', 'semi').ok, 'custom club may create its own affiliate'); const t = a.s.fr.teams; assert.equal(t[0].pk, t[1].pk); ok('custom club counts as the slot and can create its own affiliate'); }
{ const a = await mk(7); assert.ok(buy(a, 'football', 'football_5', 'pro').ok); const s = a.s; const t = s.fr.team; delete s.fr.teams; delete t.pk; delete t.side; const st = a.getFranchise(); assert.equal(st.teams.length, 1); assert.equal(s.fr.teams[0].side, 'major'); assert.ok(!buy(a, 'football', 'football_6', 'pro').ok); assert.ok(buy(a, 'football', 'football_5_m', 'semi').ok); ok('old saves migrate: team kept, others locked'); }
console.log('franchise_pairs: PASS');
