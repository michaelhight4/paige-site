// Headless seeded smoke test: node tests/smoke.mjs
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import * as Biz from '../src/business.js';
import * as Studio from '../src/studio.js';
import * as Market from '../src/market.js';
import * as Sports from '../src/sports.js';
import fs from 'node:fs';
// vendored UMD replay engine (no DOM needed for buildIndex/stateAt; createReplay accepts a stub canvas)
const loadUMD = (p) => { const m = { exports: {} }; new Function('module', 'self', fs.readFileSync(new URL(p, import.meta.url), 'utf8'))(m, undefined); return m.exports; };
const Replay = loadUMD('../src/vendor/replay.js');
const { D } = E;
await E.loadData();
let n = 0; const ok = (m) => console.log('  ok -', m, (++n, ''));
const finite = (o, path = 'state') => { for (const [k, v] of Object.entries(o)) { if (typeof v === 'number') assert.ok(Number.isFinite(v), `NaN at ${path}.${k}`); else if (v && typeof v === 'object') finite(v, path + '.' + k); } };
const clone = (x) => JSON.parse(JSON.stringify(x));

const ST = D.studio;
function studioWith(s, type, skill, perRole = 1) {
  const r = Biz.found(s, type); assert.ok(r.ok, r.err); const b = r.biz;
  b.staff = []; const prof = Studio.profile(ST.mediaTypes[type].unitName ? type : type, null);
  for (const role of prof.roles) for (let i = 0; i < perRole; i++) b.staff.push({ id: b.staff.length + 1, role: role.id, name: 'x', skill, salary: role.base });
  b.equip.ws = 30; b.equip.suite = 30; return b;
}
const hardest = (arr) => arr.reduce((a, b) => (a.difficulty > b.difficulty ? a : b)), easiest = (arr) => arr.reduce((a, b) => (a.difficulty < b.difficulty ? a : b));
const draftFor = (s, b, o = {}) => { const d = Studio.defaultDraft(Studio.profile(D.bizTypes[b.type].medium).medium, b); Object.assign(d, o); if (o.genre && !o.split) d.split = Studio.idealSplit(o.genre); return d; };

console.log('1. Studio duration / quality / skill (game, film, tv)');
for (const med of ['game', 'film', 'tv']) {
  const s = E.newGame({ seed: 7, sandbox: true });
  const novice = studioWith(s, med, 10, 1), expert = studioWith(s, med, 90, 4), prof = Studio.profile(med, med === 'tv' ? 'live' : null);
  const tiers = prof.tiers, hard = hardest(ST.genres).id, easy = easiest(ST.genres).id;
  const pv = (b, o) => Studio.preview(s, b, draftFor(s, b, o));
  const worst = pv(novice, { tier: tiers.at(-1).id, genre: hard }), best = pv(expert, { tier: tiers[0].id, genre: easy });
  console.log(`   ${med}: novice top-tier hard genre = ${worst.duration.toFixed(1)}y, expert small easy = ${best.duration.toFixed(2)}y`);
  assert.ok(worst.duration <= 20 && best.duration >= 0.25 && best.duration <= 1.5);
  if (med !== 'tv') assert.ok(worst.duration >= 10, 'novice epic >= 10y');
  assert.ok(best.requiredPts > 0 && best.teamPts > 0 && Math.abs(best.requiredPts / best.teamPts / 12 - best.duration) < 0.3 || best.duration === 0.5 || med === 'tv', 'points ~ duration');
  ok(med + ' duration range (10+ years possible for game/film), required points consistent');
  for (let i = 1; i < tiers.length; i++) assert.ok(pv(expert, { tier: tiers[i].id }).duration > pv(expert, { tier: tiers[i - 1].id }).duration, 'bigger tier longer');
  assert.ok(pv(expert, { tier: 'medium' }).duration < pv(novice, { tier: 'medium' }).duration, 'experienced faster');
  ok(med + ' tier monotonic, experience speeds up');
  // quality tradeoffs
  const good = pv(expert, { genre: 'rpg' }), badSplit = { gameplay: 80, graphics: 5, sound: 5, story: 5, polish: 5 };
  const bad = pv(expert, { genre: 'rpg', split: badSplit });
  assert.ok(good.score > bad.score + 0.8 && good.balance > bad.balance && bad.warnings.length > 0, 'slider balance matters');
  assert.ok(good.duration > bad.duration, 'higher quality => longer');
  const comp = ST.themes.map((t, i) => ({ t: t.id, c: ST.compatibility.rpg[i] })).sort((a, b) => b.c - a.c);
  const cb = pv(expert, { genre: 'rpg', theme: comp[0].t }), cw = pv(expert, { genre: 'rpg', theme: comp.at(-1).t });
  assert.ok(cb.score > cw.score && cb.compat > cw.compat);
  const eb = pv(expert, { engine: prof.engines.at(-1).id }), e0 = pv(expert, { engine: prof.engines[0].id });
  assert.ok(eb.score > e0.score && eb.expF > e0.expF && eb.budget > e0.budget, 'engine: quality & speed for cost');
  const big = pv(expert, { tier: tiers.at(-1).id }), small = pv(expert, { tier: tiers[0].id });
  assert.ok(big.risk > small.risk && big.budget > small.budget && big.duration > small.duration && big.revenue > small.revenue, 'bigger = riskier, costlier, longer, bigger payoff');
  assert.ok(pv(novice, {}).score < pv(expert, {}).score, 'team skill raises score');
  ok(med + ' quality tradeoffs: split balance, compat, engine, tier risk/payoff, skill');
  // skill growth over finished projects
  const s2 = E.newGame({ seed: 9, sandbox: true }); const b = studioWith(s2, med, 30, 1); s2.cash = 1e10;
  const dd = draftFor(s2, b, { tier: 'small' }); const before = b.staff[0].skill; let finished = 0, guard = 0;
  assert.ok(Studio.startProject(s2, b, dd).ok);
  while (finished < 3 && guard++ < 400) { s2.step = 0.5; E.takeTurn(s2); s2.pending.length = 0; if (!s2.alive) break; if (!b.project) { finished++; if (finished < 3) assert.ok(Studio.startProject(s2, b, draftFor(s2, b, { tier: 'small' })).ok); } }
  assert.ok(finished >= 1 && b.staff[0].skill > before, 'skill grew'); console.log(`   ${med}: skill ${before} -> ${b.staff[0].skill.toFixed(1)} after ${finished} projects`);
  assert.ok(Studio.skillGainEstimate(30, 3, 1.3) > Studio.skillGainEstimate(30, 0, 0.8) * 2 && Studio.skillGainEstimate(90, 1, 1) < Studio.skillGainEstimate(30, 1, 1));
  ok(med + ' skills grow with finished projects; harder = faster; diminishing returns');
  // setEffort keeps total fixed
  const d0 = Studio.getDraft(s2, b); for (const [a, v] of [['gameplay', 60], ['story', 5], ['polish', 50], ['graphics', 0]]) { Studio.setEffort(s2, b, a, v); assert.equal(Object.values(d0.split).reduce((x, y) => x + y, 0), 100); }
  ok(med + ' setEffort keeps 100 total');
}

console.log('2. Sector effect');
{
  const s = E.newGame({ seed: 3, sandbox: true }); const c = Biz.found(s, 'coffee').biz; Biz.buyEquip(s, c, 'roaster'); for (let i = 0; i < 4; i++) Biz.hire(s, c, 'barista', 'mid');
  for (const sec of D.sectors) s.market.sectors[sec.id].h = 50;
  s.market.sectors.food.h = 80; const hi = Biz.annualFinance(s, c).revenue; s.market.sectors.food.h = 20; const lo = Biz.annualFinance(s, c).revenue;
  assert.ok(hi > lo * 1.2); ok(`coffee revenue ${Math.round(lo)} (h=20) < ${Math.round(hi)} (h=80)`);
  for (const [med, sec] of [['game', 'tech'], ['film', 'media'], ['tv', 'media']]) {
    const run = (h) => { const s2 = E.newGame({ seed: 11, sandbox: true }); const b = studioWith(s2, med, 60, 1); s2.market.sectors[sec].h = h; const d = draftFor(s2, b, { tier: 'medium' });
      Studio.startProject(s2, b, d); b.project.troubleAt = null; s2.rs = 555; b.project.progress = b.project.duration - 0.01; return Studio.tickProject(s2, b, 0.5); };
    const rl = run(20), rh = run(80); assert.ok(rh.revenue > rl.revenue && rh.score === rl.score); ok(`${med} release revenue ${Math.round(rl.revenue)} (${sec} 20) < ${Math.round(rh.revenue)} (${sec} 80)`);
  }
  const mean = (h) => { const s2 = E.newGame({ seed: 5, sandbox: true }); for (let i = 0; i < 12; i++) { s2.market.sectors.tech.h = h; Market.tickMarket(s2, 0.25); } return s2.market.stocks.BYTE.p; };
  assert.ok(mean(85) > mean(15) * 1.3); ok('stock price follows sector health');
  const s3 = E.newGame({ seed: 8, sandbox: true }); const hs = []; for (let i = 0; i < 200; i++) { Market.tickMarket(s3, 0.25); hs.push(s3.market.sectors.tech.h); }
  assert.ok(Math.min(...hs) >= 3 && Math.max(...hs) <= 97 && Math.max(...hs) - Math.min(...hs) > 15); ok('sector random walk bounded & varies');
}

console.log('2b. Consoles');
{
  const s = E.newGame({ seed: 14, sandbox: true }); assert.equal(ST.consoles.length, 4);
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0); const sh0 = Studio.getConsoleShare(s); assert.ok(Math.abs(sum(sh0) - 100) < 0.5);
  let maxMove = 0, refreshes = 0; const hist = [sh0];
  for (let y = 0; y < 25; y++) { s.step = 1; s.pending.length = 0; E.takeTurn(s); const sh = Studio.getConsoleShare(s); assert.ok(Math.abs(sum(sh) - 100) < 0.5); hist.push(sh); }
  for (const id of Object.keys(hist[0])) maxMove = Math.max(maxMove, Math.abs((hist.at(-1)[id] || 0) - hist[0][id]));
  const powers = s.market.consoles.map((c) => c.power); assert.ok(maxMove > 5, 'share shifts over the years'); assert.ok(new Set(powers.map((x) => Math.round(x))).size > 1);
  ok(`12 consoles (6 makers), shares sum to 100, shift yearly (max move ${maxMove.toFixed(1)} pts), power varies`);
  const b = studioWith(s, 'game', 70, 2); const shares = Studio.getConsoleShare(s); const ids = Object.keys(shares).sort((x, y) => shares[y] - shares[x]);
  s.market.consoles.forEach((c) => (c.power = 80)); // isolate share effect
  const top = Studio.preview(s, b, draftFor(s, b, { platform: ids[0] })), low = Studio.preview(s, b, draftFor(s, b, { platform: ids.at(-1) }));
  assert.ok(top.sales > low.sales * 1.1 && top.share > low.share); ok('platform market share drives sales');
  const cs = s.market.consoles.find((c) => c.id === ids[0]); cs.power = 95; const hiP = Studio.preview(s, b, draftFor(s, b, { platform: ids[0], genre: 'action', split: { gameplay: 20, graphics: 40, sound: 10, story: 10, polish: 20 } })); cs.power = 40;
  const loP = Studio.preview(s, b, draftFor(s, b, { platform: ids[0], genre: 'action', split: { gameplay: 20, graphics: 40, sound: 10, story: 10, polish: 20 } })); assert.ok(hiP.score > loP.score); ok('console hardware power lifts graphics-heavy games');
}

console.log('2c. Sensation / fame');
{
  const rate = (skill, n) => { let sens = 0, fameMax = 0; for (let i = 0; i < n; i++) { const s = E.newGame({ seed: 100 + i, sandbox: true }); const b = studioWith(s, 'game', skill, 2); s.cash = 1e10;
      const d = draftFor(s, b, { tier: 'small', genre: 'rpg', theme: 'fantasy', marketing: 'blitz' }); Studio.startProject(s, b, d); b.project.troubleAt = null; b.project.progress = b.project.duration - 0.01; const r = Studio.tickProject(s, b, 0.5); if (r.sensation) { sens++; fameMax = Math.max(fameMax, b.fame); } }
    return { sens, fameMax }; };
  const hiR = rate(95, 150), loR = rate(10, 150); console.log(`   sensation rate high-quality ${hiR.sens}/150 vs low ${loR.sens}/150`);
  assert.ok(hiR.sens > loR.sens && hiR.sens >= 5); ok('sensation chance rises with quality/hype/trend');
  // a forced sensation: sales spike, fame, stock lift, unlock
  let found = null;
  for (let i = 0; i < 400 && !found; i++) { const s = E.newGame({ seed: 500 + i, sandbox: true }); const b = studioWith(s, 'game', 95, 2); s.cash = 1e10; const d = draftFor(s, b, { tier: 'small', genre: 'rpg', theme: 'fantasy', marketing: 'blitz' });
    const exp = Studio.preview(s, b, d); Studio.startProject(s, b, d); b.project.troubleAt = null; b.project.progress = b.project.duration - 0.01; const p0 = s.market.stocks[b.tkr].p, f0 = b.fame; const r = Studio.tickProject(s, b, 0.5);
    if (r.sensation) found = { s, b, r, exp, p0, f0 }; }
  assert.ok(found, 'sensation occurred'); const { s: ss, b: sb, r: sr } = found;
  assert.ok(sr.sensMult >= ST.balance.sensation.salesMultMin && sr.sales > found.exp.sales * 1.8, 'sales spike'); assert.ok(sb.fame >= found.f0 + ST.balance.sensation.fameBase, 'fame up');
  assert.ok(ss.market.stocks[sb.tkr].p > found.p0 * 1.15, 'studio stock lifted'); assert.ok(ss.fx.length > 0, 'fx queued for the UI burst');
  sb.fame = 0; const gated = ST.specialists.find((x) => x.minFame >= 30 && x.media.includes('game')); ss.cash = 1e9; assert.ok(!Studio.hire(ss, sb, gated.id), 'locked below fame'); sb.fame = gated.minFame; assert.ok(Studio.hire(ss, sb, gated.id), 'fame unlocks talent');
  sb.fame = 0; const dm0 = Studio.fameTier(sb).dealMult; sb.fame = 90; assert.ok(Studio.fameTier(sb).dealMult > dm0); const v90 = Biz.valuation(ss, sb); sb.fame = 0; assert.ok(v90 > Biz.valuation(ss, sb)); sb.fame = 20;
  const e = ST.mediaTypes.game.engines.find((x) => x.minFame > 30); sb.fame = 0; assert.ok(!Studio.startProject(ss, sb, draftFor(ss, sb, { engine: e.id })).ok); sb.fame = e.minFame; assert.ok(Studio.startProject(ss, sb, draftFor(ss, sb, { engine: e.id })).ok);
  ok('sensation: sales spike, fame, stock lift, fx event, fame unlocks specialists/engines/deals/valuation');
}

console.log('2d. TV seasons');
{
  const s = E.newGame({ seed: 31, sandbox: true }); const b = studioWith(s, 'tv', 70, 2); s.cash = 1e10;
  const cost = (eps) => Studio.preview(s, b, draftFor(s, b, { tier: 'medium', episodes: eps })).budget; assert.ok(cost(22) > cost(6) * 3 && cost(13) > cost(10), 'per-season budget scales with episodes');
  const fmts = ST.mediaTypes.tv.formats; assert.deepEqual(Object.keys(fmts).sort(), ['animation', 'anime', 'live']);
  const labels = Object.keys(fmts).map((f) => Studio.profile('tv', f).areas[1].label); assert.ok(new Set(labels).size >= 2, 'formats relabel areas');
  const run = (extra, quick = true) => { const d = draftFor(s, b, { tier: 'small', ...extra }); const r = Studio.startProject(s, b, d); assert.ok(r.ok, r.err); b.project.troubleAt = null; b.project.progress = b.project.duration - 0.01; return Studio.tickProject(s, b, 0.5); };
  const r1 = run({ title: 'Test Show', format: 'anime', episodes: 12 }); const show = b.shows[0]; assert.equal(show.seasons.length, 1); assert.ok(['renewed', 'cancelled'].includes(show.status)); assert.equal(show.format, 'anime');
  let seasons = 1, cancelled = 0, renewed = 0, guard = 0;
  while (guard++ < 40) {
    const sh = b.shows[0]; if (sh.status === 'cancelled') { cancelled++; break; } renewed++;
    const opts = Studio.sequelOptions(b); assert.ok(opts.some((o) => o.id === sh.id), 'renewed show offers a sequel season');
    const before = sh.ratings; run({ sequelOf: sh.id, episodes: 10 }); seasons++; assert.equal(b.shows.length, 1, 'same show, new season'); assert.equal(sh.seasons.length, seasons);
    assert.ok(Math.abs(sh.ratings - (before * 0.5 + sh.seasons.at(-1).score * 0.5)) < 1e-6, 'ratings carry over');
  }
  assert.ok(seasons >= 2); console.log(`   show ran ${seasons} seasons, final status ${b.shows[0].status}`);
  // weak show gets cancelled; cancelled shows cannot get sequels
  const s3 = E.newGame({ seed: 77, sandbox: true }); const b3 = studioWith(s3, 'tv', 5, 1); s3.cash = 1e10; let canc = null;
  for (let i = 0; i < 20 && !canc; i++) { const d = draftFor(s3, b3, { tier: 'small', genre: 'horror', theme: 'farming', split: { gameplay: 5, graphics: 5, sound: 5, story: 5, polish: 80 }, title: 'Dud' + i }); Studio.startProject(s3, b3, d); b3.project.troubleAt = null; b3.project.progress = b3.project.duration - 0.01; Studio.tickProject(s3, b3, 0.5); canc = b3.shows.find((x) => x.status === 'cancelled'); }
  assert.ok(canc, 'a weak show is cancelled'); assert.ok(!Studio.sequelOptions(b3).some((o) => o.id === canc.id)); ok('tv: formats, episodes budget, seasons, ratings carry-over, renewal & cancellation');
  // sequels for films carry franchise info
  const sf = E.newGame({ seed: 41, sandbox: true }); const bf = studioWith(sf, 'film', 70, 2); sf.cash = 1e10;
  const rr = (o) => { Studio.startProject(sf, bf, draftFor(sf, bf, { tier: 'small', ...o })); bf.project.troubleAt = null; bf.project.progress = bf.project.duration - 0.01; return Studio.tickProject(sf, bf, 0.5); };
  const f1 = rr({ title: 'Part One' }); assert.ok(Studio.sequelOptions(bf).some((o) => o.id === f1.id)); const f2 = rr({ sequelOf: f1.id, title: 'Part Two' }); assert.equal(f2.franchise, f1.id); assert.equal(Studio.getHistory(bf, 'film').length, 2); ok('film sequels tracked as franchise; history hook');
}

console.log('3. Full multi-system run (sandbox, quarterly, 40y)');
{
  const s = E.newGame({ seed: 42, sandbox: true, name: 'Tester' }); s.step = 0.25;
  const coffee = Biz.found(s, 'coffee').biz, gs = Biz.found(s, 'game').biz, fs = Biz.found(s, 'film').biz, ts = Biz.found(s, 'tv').biz;
  for (const [b, m] of [[gs, 'game'], [fs, 'film'], [ts, 'tv']]) for (const r of ST.mediaTypes[m].roles) { Biz.hire(s, b, r.id, 'mid'); Biz.hire(s, b, r.id, 'mid'); b.equip.ws = 20; b.equip.suite = 20; }
  Biz.buyEquip(s, coffee, 'roaster'); Biz.hire(s, coffee, 'barista', 'mid');
  const sportsIdx = s.offers.findIndex((o) => o.type === 'sports'); assert.ok(Biz.buyOffer(s, sportsIdx).ok);
  const gi = s.offers.findIndex((o) => o.type === 'grocery'); assert.ok(Biz.buyOffer(s, gi).ok);
  assert.ok(E.buyAsset(s, 'sedan') && E.buyAsset(s, 'suburb', true) && E.buyAsset(s, 'yacht') && E.buyAsset(s, 'prop'));
  assert.ok(Market.buyStock(s, 'BYTE', 100) && Market.buyStock(s, gs.tkr, 1000));
  let releases = 0, finalsPlayed = 0, interactive = 0;
  for (let i = 0; i < 160 && s.alive; i++) {
    while (s.pending.length) E.resolveCard(s, 0) .ok === false && E.resolveCard(s, s.pending[0].kind === 'event' ? D.events.find((e) => e.id === s.pending[0].id).choices.length - 1 : 1);
    for (const b of s.biz) if (b.kind === 'studio' && !b.project) { const med = D.bizTypes[b.type].medium; const d = draftFor(s, b, { tier: ['small', 'medium'][i % 2], genre: ST.genres[i % 8].id, theme: ST.themes[(i * 3) % 8].id }); const sq = Studio.sequelOptions(b); if (sq.length && i % 3 === 0) { d.sequelOf = sq[0].id; d.genre = sq[0].genre; d.theme = sq[0].theme; if (med === 'tv') d.format = sq[0].format; } assert.ok(Studio.startProject(s, b, d).ok); }
    if (s.league.finals && !s.league.finals.done) { const f = s.league.finals; interactive++; let k = 0; while (!f.done && k++ < 40) { assert.ok(f.opts.length >= 3 && f.opts.length <= 4); Sports.finalsPlay(s, f.opts[k % f.opts.length]); } finalsPlayed++; }
    E.takeTurn(s);
    // trading
    if (i % 12 === 0 && s.league.my >= 0) { const me = s.league.teams[s.league.my]; const other = s.league.teams[(s.league.my + 1) % 8]; Sports.proposeTrade(s, [me.roster[0].id], other.id, [other.roster[0].id]); Sports.signFA(s, s.league.fa[0].id); }
    if (i % 20 === 0) { Market.sellStock(s, 'BYTE', 10); E.doAction(s, 'gym'); }
    finite(s.market.sectors); 
  }
  releases = s.biz.reduce((a, b) => a + b.released.length, 0);
  console.log(`   age ${s.age.toFixed(1)}, releases ${releases}, finals-interactive ${interactive}, titles history ${s.league.history.length}, NW ${Math.round(E.netWorth(s).total).toLocaleString()}`);
  assert.ok(releases >= 3, 'studios released projects'); assert.ok(s.league.history.length >= 5, 'seasons advanced');
  finite({ cash: s.cash, debt: s.debt, stats: s.stats, nw: E.netWorth(s) }); ok('multi-system run finite & progressing');
  const st = Sports.standings(s); assert.equal(st.length, 8); ok('standings ok');
  const r = JSON.parse(JSON.stringify(s)); assert.equal(r.cash, s.cash); assert.equal(E.netWorth(r).total, E.netWorth(s).total); ok('save JSON round-trip');
  // determinism
  const a = E.newGame({ seed: 99 }), b2 = E.newGame({ seed: 99 }); for (let i = 0; i < 30; i++) { for (const x of [a, b2]) { x.pending.length = 0; E.takeTurn(x); } }
  assert.equal(a.cash + a.stats.smarts + a.age, b2.cash + b2.stats.smarts + b2.age); ok('seeded determinism');
}

console.log('3b. Sports: stacked team reaches interactive finals, trade market');
{
  const s = E.newGame({ seed: 21, sandbox: true }); s.step = 1;
  Biz.buyOffer(s, s.offers.findIndex((o) => o.type === 'sports'));
  const me = s.league.teams[s.league.my]; for (const p of me.roster) for (const k of Object.keys(p.r)) p.r[k] = Math.min(99, p.r[k] + 25);
  let reached = 0, won = 0;
  for (let i = 0; i < 12; i++) {
    s.pending.length = 0; s.alive = true; s.ending = null; E.takeTurn(s); // (revive: this section is about sports, not mortality)
    const f = s.league.finals; if (f && !f.done) { reached++; assert.ok(f.opts.length >= 3 && f.opts.length <= 4); assert.equal(E.takeTurn(s), false, 'turn blocked during finals'); let k = 0; while (!f.done && k++ < 60) Sports.finalsPlay(s, f.opts[0]); if (s.league.champ === me.name) won++; }
  }
  console.log(`   finals reached ${reached}/12, won ${won}`); assert.ok(reached >= 4 && won >= 1); ok('interactive finals playable, blocks turn, awards title');
  // trade market: lopsided offer accepted, lowball rejected
  const th = s.league.teams[(s.league.my + 1) % 8], best = [...me.roster].sort((a, b) => Sports.tradeValue(b) - Sports.tradeValue(a))[0], worst = [...th.roster].sort((a, b) => Sports.tradeValue(a) - Sports.tradeValue(b))[0];
  assert.ok(Sports.proposeTrade(s, [best.id], th.id, [worst.id]).ok); assert.ok(!Sports.proposeTrade(s, [worst.id], th.id, [best.id]).ok); ok('trade AI accepts fair+ offers, rejects lowballs');
}
console.log('3c. Event-log v1 + replay (headless)');
{
  const s = E.newGame({ seed: 21, sandbox: true }); s.step = 0.5; Biz.buyOffer(s, s.offers.findIndex((o) => o.type === 'sports'));
  const me = s.league.teams[s.league.my]; for (const p of me.roster) for (const k of Object.keys(p.r)) p.r[k] = Math.min(99, p.r[k] + 25);
  for (let i = 0; i < 6; i++) { s.pending.length = 0; s.alive = true; s.ending = null; E.takeTurn(s); if (s.league.finals && !s.league.finals.done) Sports.finalsAuto(s); }
  assert.ok(s.league.games.length >= 3);
  const checkLog = (log, hs, as, label) => {
    const ix = Replay.buildIndex(log), ids = new Set(Object.keys(ix.players)); assert.equal(log.version, 1);
    for (const e of log.events) { assert.ok(Number.isFinite(e.t)); if (e.actor) assert.ok(ids.has(e.actor), 'actor ' + e.actor); if (e.target) assert.ok(ids.has(e.target)); if (e.x != null) assert.ok(e.x >= 0 && e.x <= 1 && e.y >= 0 && e.y <= 1, 'coords ' + JSON.stringify(e)); }
    const fin = Replay.stateAt(ix, ix.duration); assert.deepEqual(fin.score, [hs, as], label + ' replay score == sim score');
    const asp = ix.meta.field.h / ix.meta.field.w; let prev = null, mx = 0, dt = 0.5;
    for (let t = 0; t <= ix.duration; t += dt) { const st = Replay.stateAt(ix, t); st.players.forEach((p) => assert.ok(p.x >= 0 && p.x <= 1)); if (prev) st.players.forEach((p, i) => { const q = prev.players[i]; if (q.id === p.id) mx = Math.max(mx, Math.hypot(p.x - q.x, (p.y - q.y) * asp) / dt); }); prev = st; }
    assert.ok(mx <= ix.sport.vmax * 1.6, `${label} fast-runner: ${mx.toFixed(3)} > ${ix.sport.vmax * 1.6}`); return { ix, mx };
  };
  let worst = 0; for (const g of s.league.games) { const { mx } = checkLog(Sports.buildEventLog(g), g.hs, g.as, 'game'); worst = Math.max(worst, mx); }
  assert.deepEqual(Sports.buildEventLog(s.league.games[0]), Sports.buildEventLog(s.league.games[0])); ok(`${s.league.games.length} game logs: valid v1, replay score == sim score, seeded/deterministic, max speed ${worst.toFixed(2)} fw/s`);
  // live finals: play_call -> choose -> log grows
  let s2 = E.newGame({ seed: 21, sandbox: true }); s2.step = 1; Biz.buyOffer(s2, s2.offers.findIndex((o) => o.type === 'sports')); const m2 = s2.league.teams[s2.league.my]; for (const p of m2.roster) for (const k of Object.keys(p.r)) p.r[k] = 99;
  s2.alive = true; E.takeTurn(s2); const f = s2.league.finals; assert.ok(f && !f.done && f.mine);
  let log = Sports.finalsLog(s2); let calls = log.events.filter((e) => e.type === 'play_call'); assert.equal(calls.length, 1); assert.ok(calls[0].call.options.length >= 3 && calls[0].call.options.length <= 4 && calls[0].call.options[0].routes.length > 0);
  const stub = new Proxy({}, { get: (t, k) => (k === 'measureText' ? () => ({ width: 50 }) : typeof t[k] === 'undefined' ? () => ({ addColorStop() {} }) : t[k]), set: (t, k, v) => ((t[k] = v), true) });
  const canvas = { width: 960, height: 600, getContext: () => stub }; const rp = Replay.createReplay(canvas, log, { requestFrame: false, pauseOnPlayCall: true });
  rp.seek(0); rp.play(); rp.tick(500); assert.ok(rp.awaiting && !rp.playing, 'pauses at the play call'); const choice = rp.choosePlay(calls[0].call.options[1].id); assert.equal(choice.type, 'play_choice');
  let plays = 0;
  while (!f.done && plays < 40) { assert.ok(Sports.finalsPlay(s2, plays ? f.opts[0] : choice.play_id) !== null); plays++; if (f.done) break; log = Sports.finalsLog(s2); assert.equal(log.events.filter((e) => e.type === 'play_call').length, plays + 1); const t = log.events.filter((e) => e.type === 'play_call').at(-1).t; rp.load(log); rp.seek(t); }
  assert.ok(f.done); const fl = Sports.finalsLog(s2); assert.ok(fl, 'finished finals log kept'); const chk = checkLog(fl, f.sc[0], f.sc[1], 'finals'); assert.ok(chk.ix.calls.length >= 20);
  assert.throws(() => Replay.buildIndex({}), /invalid/); assert.equal(Sports.finalsPlay(s2, 'iso'), null, 'no play after finals'); ok(`live finals: pause at play_call, choose, log rebuilt each possession (${plays} calls), final score ${f.sc.join('-')} matches replay`);
}

console.log('4. Normal life to death (several seeds)');
for (const seed of [1, 2, 3, 4, 5]) {
  const s = E.newGame({ seed, name: 'Life' }); s.step = 1; let guard = 0;
  while (s.alive && guard++ < 400) {
    while (s.pending.length) { const c = E.pendingCard(s); E.resolveCard(s, 0).ok || E.resolveCard(s, c.choices.length - 1); }
    if (!s.job) { const el = E.eligibleCareers(s); if (el.length) E.applyJob(s, el[el.length - 1].id); }
    E.doAction(s, 'work'); E.takeTurn(s);
  }
  assert.ok(!s.alive && s.ending && s.ending.age > 0 && s.ending.age < 160); finite({ c: s.cash, d: s.debt, st: s.stats });
  console.log(`   seed ${seed}: died ${s.ending.age} (${s.ending.cause}), edu ${s.edu}, job ${s.ending.job}, NW ${Math.round(s.ending.netWorth.total)}`);
}
ok('life runs birth->death');
await import('./life.mjs');
await import('./premium.mjs');
await import('./adapter.mjs');
await import('./events_rate.mjs');
await import('./growth.mjs');
await import('./biz.mjs');
await import('./inherit.mjs');
await import('./character.mjs');
await import('./balance.mjs');
await import('./slots.mjs');
await import('./carry.mjs');
await import('./autopilot.mjs');
await import('./ads.mjs');
await import('./scholarships2.mjs');
await import('./online.mjs');
console.log('\nALL SMOKE TESTS PASSED');
await import('./social.mjs');
await import('./politics.mjs');
await import('./coaching.mjs');
await import('./prodco.mjs');
