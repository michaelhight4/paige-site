// Turn-based market: sector health random walk + macro events; stocks track sector health.
import { D } from './data.js';
import { rnd, gauss, chance, pick, clamp } from './rng.js';
import { log, earn } from './core.js';
import * as Hw from './hardware.js';

export function initMarket(s) {
  const m = (s.market = { sectors: {}, macro: null, consoles: [], stocks: {}, cos: [], news: [] });
  for (const sec of D.sectors) m.sectors[sec.id] = { h: clamp(50 + gauss(s) * 8, 25, 75), hist: [] };
  initConsoles(s);
  for (const c of D.companies) {
    m.cos.push({ ...c });
    m.stocks[c.tkr] = { p: c.base, hist: [c.base], mom: 1 };
  }
  s.hold = {};
  for (const sec of D.sectors) m.sectors[sec.id].hist.push(m.sectors[sec.id].h);
}

// demand multiplier from sector health: 0.6 (h=0) .. 1.0 (h=50) .. 1.4 (h=100)
export const sectorMult = (s, id) => (id ? 0.6 + 0.8 * (s.market.sectors[id].h / 100) : 1);

export function tickMarket(s, dt) {
  const m = s.market, sq = Math.sqrt(dt);
  // macro event
  let macroAll = 0, macroSec = {};
  if (m.macro) {
    const e = m.macro;
    if (e.all) macroAll = e.all * sq;
    if (e.sector) macroSec[e.sector] = e.delta * sq;
    if (--e.left <= 0) m.macro = null;
  } else if (chance(s, 0.25 * dt)) {
    const e = pick(s, D.macroEvents);
    m.macro = { ...e, left: e.turns };
    m.news.push({ age: s.age, text: `${e.name}: ${e.text}` });
    log(s, `NEWS: ${e.name} - ${e.text}`, 'news');
  }
  for (const sec of D.sectors) {
    const o = m.sectors[sec.id];
    o.h = clamp(o.h + (50 - o.h) * (1 - Math.exp(-0.25 * dt)) + gauss(s) * 5 * sq + macroAll + (macroSec[sec.id] || 0), 3, 97);
    o.hist.push(o.h); if (o.hist.length > 80) o.hist.shift();
  }
  // stocks
  for (const c of m.cos) {
    const st = m.stocks[c.tkr]; if (!st) continue;
    if (c.npcMedium && chance(s, 0.3 * dt)) {
      const score = clamp(6.5 + gauss(s) * 1.6, 2, 10);
      st.p *= Math.exp((score - 6.5) * 0.1);
      const msg = `${c.name} released a ${c.npcMedium === 'game' ? 'game' : 'film'} scoring ${score.toFixed(1)}`;
      m.news.push({ age: s.age, text: msg });
    }
    const target = c.bizId != null ? playerStockTarget(s, c) : c.base * (0.6 + 0.8 * m.sectors[c.sector].h / 100) * Math.pow(1.04, s.age);
    st.p += (target - st.p) * (1 - Math.exp(-1.2 * dt));
    st.p = Math.max(0.5, st.p * Math.exp(gauss(s) * c.vol * sq));
    st.hist.push(st.p); if (st.hist.length > 80) st.hist.shift();
  }
  if (m.news.length > 30) m.news.splice(0, m.news.length - 30);
}

// A player-founded studio is listed: price ~ valuation / 100k shares.
function playerStockTarget(s, c) {
  const b = s.biz.find((x) => x.id === c.bizId);
  return b ? Math.max(0.5, b.valuation / 100000) : 0.5;
}
export function listPlayerStudio(s, biz) {
  const tkr = (biz.name.replace(/[^A-Za-z]/g, '').slice(0, 3) + biz.id).toUpperCase();
  s.market.cos.push({ tkr, name: biz.name + ' (yours)', sector: D.bizTypes[biz.type].sector, base: 1, vol: 0.06, bizId: biz.id });
  s.market.stocks[tkr] = { p: Math.max(0.5, biz.valuation / 100000), hist: [], mom: 1 };
  biz.tkr = tkr;
}
export function studioReleaseShock(s, biz, score) {
  const st = s.market.stocks[biz.tkr]; if (st) st.p *= Math.exp((score - 6.5) * 0.1);
}

export function buyStock(s, tkr, n) {
  const st = s.market.stocks[tkr], cost = st.p * n;
  if (n <= 0 || cost > s.cash) return false;
  s.cash -= cost;
  const h = (s.hold[tkr] ||= { sh: 0, cost: 0 }); h.sh += n; h.cost += cost; return true;
}
export function sellStock(s, tkr, n) {
  const h = s.hold[tkr], st = s.market.stocks[tkr];
  if (!h || n <= 0 || n > h.sh) return false;
  earn(s, st.p * n); h.cost *= (h.sh - n) / h.sh; h.sh -= n;
  if (h.sh <= 0) delete s.hold[tkr]; return true;
}
export const portfolioValue = (s) => Object.entries(s.hold).reduce((a, [t, h]) => a + h.sh * s.market.stocks[t].p, 0);

// ---- consoles (four fictional ones, data/studio_data.json). `mind` = market momentum -> share; `power` = hardware, decays with age until a refresh.
export function initConsoles(s) {
  const C = D.studio.balance.consoles;
  s.market.consoles = D.studio.consoles.map((c) => ({ id: c.id, mind: c.share0, power: clamp(C.startPower - C.powerLossPerYear * c.age0, 40, 100), age: c.age0, drift: c.drift0, hist: [] }));
  Hw.ensure(s);
  // backfill 5 years of share history from each console's starting drift (deterministic, no RNG) so the Market chart isn't empty on day one
  for (let k = 5; k >= 0; k--) { const tmp = { market: { consoles: s.market.consoles.map((c) => ({ id: c.id, mind: c.mind * Math.exp(-c.drift * k) })) } }, sh = consoleShares(tmp); for (const c of s.market.consoles) c.hist.push(sh[c.id]); }
}
export function consoleShares(s) { // percent, sums to 100
  const cs = s.market.consoles, k = D.studio.balance.consoles.shareExponent, tot = cs.reduce((a, c) => a + Math.pow(c.mind, k), 0), o = {};
  for (const c of cs) o[c.id] = Math.round((Math.pow(c.mind, k) / tot) * 1000) / 10;
  return o;
}
// Called once per game year.
export function tickConsolesYear(s) {
  Hw.ensure(s);
  const C = D.studio.balance.consoles;
  for (const c of s.market.consoles) {
    c.age++; c.drift = c.drift * C.driftPersist + gauss(s) * C.driftNoise;
    c.mind = Math.max(2, c.mind * Math.exp(c.drift + gauss(s) * C.mindNoise));
    c.power = clamp(c.power - C.powerLossPerYear, 30, 100);
    if (chance(s, C.refreshChancePerYear)) {
      c.power = C.refreshPower; c.mind *= C.refreshMindBoost; c.age = 0;
      const nm = Hw.productDef(c.id).name;
      s.market.news.push({ age: s.age, text: `${nm} launches a hardware refresh!` });
    }
  }
  Hw.yearTick(s);
  const sh = consoleShares(s); for (const c of s.market.consoles) { c.hist.push(sh[c.id]); if (c.hist.length > 60) c.hist.shift(); }
}
