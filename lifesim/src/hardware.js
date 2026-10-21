// Console makers: 4 major + 2 minor fictional manufacturers at any time, each with a home console and a handheld. Every game year the market simulates
// share (src/market.js), maker health (share vs fair share + noise + hardware refreshes), bankruptcies (consoles vanish, news) and replacements (a new challenger enters
// 1-2 years later from the pool). Studio/prodco read the live platform list from here. Data: data/hardware.json (tools/build_hardware_data.py).
import { D } from './data.js';
import { rnd, gauss, clamp, rint } from './rng.js';
import { consoleShares } from './market.js';

const H = () => D.hardware;
let ACTIVE = []; // ids of live consoles, kept in sync with s.market.consoles
export const productDef = (id) => (H() && H().products[id]) || (D.studio.consoles.find((c) => c.id === id)) || { id, name: id, icon: '🎮', color: '#888', kind: 'home', blurb: '' };
export function sync(s) { ACTIVE = s && s.market ? s.market.consoles.map((c) => c.id) : []; return ACTIVE; }
export const activeProducts = () => (ACTIVE.length ? ACTIVE.map(productDef) : D.studio.consoles);
export const platformList = () => activeProducts().map((c) => ({ id: c.id, name: c.name, icon: c.icon, console: true }));

function mkConsole(id, mind, power, age, drift) { return { id, mind, power, age, drift, hist: [] }; }
function addConsole(s, id, p) { if (!s.market.consoles.some((c) => c.id === id)) s.market.consoles.push(mkConsole(id, p.mind, p.power, p.age, p.drift)); }
export function ensure(s) {
  if (!s.market) return null; const B = D.studio.balance.consoles;
  if (!s.hw) {
    s.hw = { makers: H().makers.map((m, i) => ({ ...m, tier: i < 4 ? 'major' : 'minor', since: 0 })), dead: [], pending: [], used: [], year: 0 };
    for (const [id, st] of Object.entries(H().start)) addConsole(s, id, { mind: st.mind, drift: st.drift, age: st.age, power: clamp(B.startPower - B.powerLossPerYear * st.age, 40, 100) });
    const sh = consoleShares(s); for (const c of s.market.consoles) if (!c.hist.length) c.hist.push(sh[c.id]);
  }
  sync(s); return s.hw;
}
const shareOf = (sh, m) => (sh[m.home] || 0) + (sh[m.hand] || 0);
function retier(s, sh) { const o = s.hw.makers.slice().sort((a, b) => shareOf(sh, b) - shareOf(sh, a)); o.forEach((m, i) => (m.tier = i < H().balance.majors ? 'major' : 'minor')); }
export function list(s) {
  const hw = ensure(s), sh = consoleShares(s);
  return { makers: hw.makers.map((m) => ({ id: m.id, name: m.name, icon: m.icon, color: m.color, tier: m.tier, health: Math.round(m.health), share: Math.round(shareOf(sh, m) * 10) / 10, home: productDef(m.home).name, hand: productDef(m.hand).name, homeId: m.home, handId: m.hand }))
    .sort((a, b) => b.share - a.share), dead: hw.dead.slice(-5), pending: hw.pending.length };
}
export const makerOf = (s, consoleId) => { const hw = ensure(s); return hw ? hw.makers.find((m) => m.home === consoleId || m.hand === consoleId) || null : null; };
function bankrupt(s, m) {
  const hw = s.hw; hw.makers = hw.makers.filter((x) => x !== m); s.market.consoles = s.market.consoles.filter((c) => c.id !== m.home && c.id !== m.hand);
  hw.dead.push({ name: m.name, age: Math.floor(s.age), consoles: [productDef(m.home).name, productDef(m.hand).name] });
  s.market.news.push({ age: s.age, text: `${m.name} goes bankrupt. ${productDef(m.home).name} and ${productDef(m.hand).name} are discontinued.` });
  hw.pending.push({ due: hw.year + rint(s, H().balance.replaceMin, H().balance.replaceMax) });
}
function enter(s) {
  const hw = s.hw, B = H().balance, D0 = D.studio.balance.consoles; let cand = H().pool.find((p) => !hw.used.includes(p.id) && !hw.makers.some((m) => m.id === p.id));
  if (!cand) { const n = hw.used.length - H().pool.length + 2; const base = H().pool[hw.used.length % H().pool.length]; cand = { ...base, id: base.id + '_' + n, name: base.name + ' ' + 'II'.repeat(1) + (n > 2 ? n : '') }; }
  hw.used.push(cand.id); const minor = hw.makers.filter((m) => m.tier === 'minor').length < H().balance.minors;
  const mk = { id: cand.id, name: cand.name, color: cand.color, icon: cand.icon, home: cand.home || cand.id + '_h', hand: cand.hand || cand.id + '_p', health: 55, tier: minor ? 'minor' : 'major', since: hw.year };
  if (!H().products[mk.home]) { const b = H().products[H().pool[0].home]; H().products[mk.home] = { ...b, id: mk.home, name: cand.name + ' Home', maker: cand.name }; H().products[mk.hand] = { ...b, id: mk.hand, name: cand.name + ' Go', maker: cand.name, kind: 'handheld' }; }
  hw.makers.push(mk);
  s.market.consoles.push(mkConsole(mk.home, minor ? B.minorNewHome : B.newHome, D0.refreshPower, 0, 0.06)); s.market.consoles.push(mkConsole(mk.hand, minor ? B.minorNewHand : B.newHand, D0.refreshPower, 0, 0.06));
  s.market.news.push({ age: s.age, text: `New challenger ${mk.name} enters the console market with ${productDef(mk.home).name} and ${productDef(mk.hand).name}.` });
}
// once a year, after market.js has aged the consoles
export function yearTick(s) {
  const hw = ensure(s); if (!hw) return; hw.year++; const B = H().balance, sh = consoleShares(s);
  for (const m of hw.makers.slice()) {
    const fair = B.fairShare, d = (shareOf(sh, m) - fair) * B.healthPerShare + gauss(s) * B.noise;
    const young = hw.year - m.since < B.bankruptCooldown; m.health = clamp(m.health + d + (young ? 4 : 0), -20, 100);
    if (m.health <= B.bankruptHealth && !young) bankrupt(s, m);
  }
  for (const p of hw.pending.slice()) if (hw.year >= p.due) { hw.pending.splice(hw.pending.indexOf(p), 1); enter(s); }
  while (hw.makers.length < B.majors + B.minors && !hw.pending.length) enter(s); // never fewer than six makers
  const sh2 = consoleShares(s); retier(s, sh2); for (const c of s.market.consoles) { if (!c.hist.length) c.hist.push(sh2[c.id]); }
  sync(s);
}
