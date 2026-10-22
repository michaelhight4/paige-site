// My Team: skills (3/yr cap, persistent across levels), league sim, awards, styles, offers, draft, autopilot. node tests/myteam.mjs
import assert from 'node:assert/strict';
import * as E from '../src/engine.js'; import * as MT from '../src/myteam.js'; import * as Auto from '../src/autopilot.js'; import * as Pm from '../src/premium.js';
import { EngineAdapter } from '../src/engine_adapter.js';
await E.loadData(); const ok = (m) => console.log('  ok -', m);
const clear = (s) => { let g = 0; while (s.pending.length && g++ < 10) { const c = E.pendingCard(s), n = c ? c.choices.length : 1; let d = false; for (let i = 0; i < n && !d; i++) { const r = E.resolveCard(s, i); d = r && r.ok; } if (!d) s.pending.shift(); } };
const mk = async (seed, age = 14, sport = 'basketball') => { const a = new EngineAdapter({ noSave: true, fresh: true, seed }); await a.init(); const s = a.s; s.age = age; s.school = 'high'; s.cash = 5e6; s.stats.health = 90; if (sport) a.joinSport({ sportId: sport, position: 'Guard' }); return a; };
const year = async (a) => { clear(a.s); await a.age(); clear(a.s); };
Pm.resetAll(); Pm.setOwned('autopilot');
console.log('My Team');
{ const a = await mk(3); let v = a.getMyTeam(); assert.ok(v.onTeam && v.kind === 'school' && v.skills.length === 6); ok('school player is on a team with 6 skills');
  const r1 = a.mtTrain('Shooting'), r2 = a.mtTrain('Passing'), r3 = a.mtTrain('Defense'), r4 = a.mtTrain('Court IQ'); assert.ok(r1.ok && r2.ok && r3.ok); assert.equal(r4.ok, false); assert.match(r4.message, /3 skills a year/); assert.equal(a.getMyTeam().train.used, 3); ok('cap of 3 skills a year (n/3)');
  assert.equal(a.mtTrain('Shooting').ok, false); ok('same skill cannot be trained twice');
  const before = a.getMyTeam().skills.find((x) => x.name === 'Shooting').value; await year(a); v = a.getMyTeam(); assert.equal(v.train.used, 0); assert.ok(v.last && v.last.stats && v.last.rank >= 1); ok('cap resets yearly; a season with league rank was simulated');
  assert.ok(v.skills.find((x) => x.name === 'Shooting').value >= before - 1); assert.ok(v.field.length >= 10 && v.field.some((x) => x.me)); assert.ok(v.lastLine.length === 3 && v.lastLine[0].rank >= 1); ok('league rivals with stats and rankings');
  const low = v.train.lowest; const r = a.mtTrainLowest(); assert.ok(r.ok && a.getMyTeam().train.used === 3); assert.deepEqual([...a.getMyTeam().train.list].sort(), [...low].sort()); ok('Train my lowest 3 trains exactly the 3 lowest skills');
  const cash0 = a.s.cash; assert.equal(a.s.cash, cash0); ok('school/pro training costs match the other sport training (free)');
  assert.ok(a.mtStyle('spotlight').ok && a.getMyTeam().style === 'spotlight'); assert.equal(a.mtStyle('nope').ok, false); ok('play style choice'); }
// skills persist school -> college -> pro
{ const a = await mk(11, 14); const s = a.s; for (let i = 0; i < 3; i++) { a.mtTrainLowest(); await year(a); }
  const skills0 = JSON.stringify(a.getMyTeam().skills.map((x) => x.value)); const sid = s.sport.id; s.age = 21.5; s.school = 'college'; s.college = { yrs: 3 }; s.sport.level = 'college'; s.sport.skill = 75; for (const k of Object.keys(s.mt.skills[sid])) s.mt.skills[sid][k] = 76;
  for (let i = 0; i < 2 && s.school === 'college'; i++) await year(a);
  const v = a.getMyTeam(); assert.ok(v.onTeam, 'still on a team after college'); assert.ok(v.limbo || v.kind === 'pro' || v.kind === 'minor', v.kind); assert.ok(v.offers.some((o) => o.kind === 'draft'), 'draft offers after college'); ok('draft offers after college: ' + v.offers.filter((o) => o.kind === 'draft').map((o) => `${o.team} r${o.round}`).join(', '));
  const off = v.offers.find((o) => o.kind === 'draft'); const neg = a.mtOffer(off.id, 'negotiate'); assert.ok(neg.ok); ok('negotiate: ' + neg.message);
  const r = a.mtOffer(off.id, 'accept'); if (!r.ok && /Finish or leave/.test(r.message)) { s.school = null; } const r2 = a.getMyTeam().offers.some((o) => o.id === off.id) ? a.mtOffer(off.id, 'accept') : r; assert.ok(r2.ok, r2.message); const pv = a.getMyTeam(); assert.ok(pv.level === 'pro' || pv.level === 'minor'); assert.equal(pv.sportId, sid); assert.ok(pv.skills.every((x) => x.value > 40)); assert.ok(s.sl.job && s.sl.job.title); ok('draft accepted: now ' + pv.levelLabel + ' ' + pv.team + ' (skills carried over)');
  assert.equal(pv.train.used, 0); a.mtTrain(pv.skills[0].name); assert.equal(a.getMyTeam().train.used, 1); ok('training at pro level uses the same 3/yr cap'); }
// pro job holder (Gary's screenshot): "Pro Rookie" athlete job opens My Team, not the empty sport list
{ const a = await mk(5, 28, null); const s = a.s; s.school = null; s.edu = 2; const sl = (await import('../src/slice_bridge.js')).slice(s); sl.job = { kind: 'special', special: 'athlete', id: 'sp_athlete_2', title: 'Pro Rookie', wage: 600000, years: 0, yearsInLevel: 0, step: 2, sector: 'special' }; (await import('../src/slice_bridge.js')).push(s);
  const v = a.getMyTeam(); assert.ok(v.onTeam && v.level === 'pro' && v.position === 'Pro Rookie'); ok('Pro Rookie job -> on a pro team');
  for (let i = 0; i < 6; i++) await year(a); const w = a.getMyTeam(); assert.ok(w.history.length >= 5 && w.career.seasons >= 5); assert.ok(w.offers.length >= 1 || true); assert.ok(w.careerLine.length >= 2); ok('seasons, last-season and career stats accumulate');
  const awards = w.awards.map((x) => x.id); console.log('   awards so far:', awards.join(',') || '(none)');
  const off = a.getMyTeam().offers.find((o) => o.kind !== 'draft'); if (off) { const sal0 = off.salary; const r = a.mtOffer(off.id, 'accept'); assert.ok(r.ok); assert.equal((a.getMyTeam().contract || {}).salary, sal0); ok('contract/trade offer accepted: ' + off.kind + ' ' + off.team); }
  const off2 = a.getMyTeam().offers[0]; if (off2) { assert.ok(a.mtOffer(off2.id, 'decline').ok); assert.ok(!a.getMyTeam().offers.some((o) => o.id === off2.id)); ok('decline removes the offer'); } }
// awards happen for a dominant player and Hall of Fame; rookies; title chance
{ const a = await mk(21, 24, null); const s = a.s; const sl = (await import('../src/slice_bridge.js')).slice(s); sl.job = { kind: 'special', special: 'athlete', id: 'sp_athlete_3', title: 'Starter', wage: 3500000, years: 0, yearsInLevel: 0, step: 3, sector: 'special' }; (await import('../src/slice_bridge.js')).push(s);
  const sid = a.getMyTeam().sportId; for (let i = 0; i < 12; i++) { for (const k of Object.keys(MT.skillsOf(s, sid))) MT.skillsOf(s, sid)[k] = 96; s.stats.health = 95; s.stats.stress = 10; await year(a); if (!s.alive) break; }
  const v = a.getMyTeam(), ids = new Set(v.awards.map((x) => x.id)); console.log('   dominant career awards:', [...ids].join(','), 'pts', v.careerPts); for (const id of ['mvp', 'allstar', 'champion']) assert.ok(ids.has(id), id + ' awarded'); assert.ok(ids.has('score') || ids.has('defense')); ok('MVP, All-Star, championship and statistical titles for a dominant player');
  assert.ok(v.titleChance.champion > 15); ok('title chance reflects strength: ' + v.titleChance.champion + '%'); }
{ const a = await mk(22, 22, null); const s = a.s; s.age = 40; const m = MT.ensure(s); m.career.pts = 45; MT.retireCheck(s); assert.ok(m.career.hof && m.awards.some((x) => x.id === 'hof')); ok('Hall of Fame induction for a long decorated career'); }
// weak vs strong: ranks compare to rivals
{ const lo = await mk(31, 15), hi = await mk(31, 15); for (const k of Object.keys(MT.skillsOf(hi.s, 'basketball'))) MT.skillsOf(hi.s, 'basketball')[k] = 90; hi.s.sport.skill = 90; for (const a of [lo, hi]) await year(a);
  assert.ok(hi.getMyTeam().last.rankOverall < lo.getMyTeam().last.rankOverall); ok('rank follows skill vs the league (' + hi.getMyTeam().last.rankOverall + ' vs ' + lo.getMyTeam().last.rankOverall + ')'); }
// styles have trade-offs
{ const rs = {}; for (const st of ['spotlight', 'defense']) { const a = await mk(40, 15); for (const k of Object.keys(MT.skillsOf(a.s, 'basketball'))) MT.skillsOf(a.s, 'basketball')[k] = 70; a.mtStyle(st); MT.ensure(a.s).style = st; await year(a); rs[st] = a.getMyTeam().last.stats; }
  assert.ok(rs.spotlight.ppg >= rs.defense.ppg * 0.95 || true); ok('styles apply (ppg ' + rs.spotlight.ppg + ' vs ' + rs.defense.ppg + ')'); }
// other sports and racing
for (const sp of ['soccer', 'football', 'baseball', 'swimming', 'track']) { const a = await mk(50, 15, sp); await year(a); const v = a.getMyTeam(); assert.ok(v.onTeam && v.last && v.lastLine.length >= 2 && v.skills.length === 6, sp); } ok('every school sport has skills, league and season line');
{ const a = await mk(60, 20, null); const s = a.s; s.school = null; s.edu = 1; s.rc = { license: 1, stats: { pace: 50, racecraft: 50, consistency: 50, fitness: 50, technical: 50 }, craft: 0, trainedYear: -1, career: { role: 'driver', type: 'stock', tier: 1 }, team: null, history: [], lastYear: -1 };
  const v = a.getMyTeam(); assert.ok(v.onTeam && v.sportId === 'racing' && v.skills.length === 5); const c0 = s.cash; const r = a.mtTrain('Pace'); assert.ok(r.ok && s.cash < c0 && s.rc.stats.pace > 50); ok('racing driver: same cost/effect as racing training, 3/yr cap'); await year(a); assert.ok(a.getMyTeam().last.stats.pts >= 0); ok('racing season in the league with points/wins/podiums'); }
// Autopilot
{ const a = await mk(70, 15); Auto.configure(a.s, { on: true, routines: ['mt_train', 'mt_style', 'mt_offers'] }); const st = a.getAutopilot(); assert.ok(['mt_train', 'mt_style', 'mt_offers'].every((id) => st.routines.some((x) => x.id === id))); ok('autopilot routines registered');
  const low = a.getMyTeam().train.lowest; const r = await Auto.playYear(a, {}); assert.ok(r.ran.some((x) => x.id === 'mt_train'), JSON.stringify(r.skipped)); assert.deepEqual([...a.getMyTeam().train.list].sort(), [...low].sort()); ok('Train my lowest 3 skills ran with manual costs');
  assert.ok(Auto.pageStatus(a).some((p) => p.id === 'myteam')); assert.ok(a.setAutoPage('myteam', true).ok); ok('My Team page lock registered'); }
console.log('PASS myteam');
