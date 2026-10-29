// Milestones (Tasks > Milestones). Design: Gary-approved "Recommended" section of kilumen_research/milestones_research.md
// (Oct 29 2026): Bronze / Silver / Gold / Platinum tiers, gifts count, existing saves get retro credit (derived counters
// are read from save state), nothing needs other players, first 5 catches of a species give bonus XP (Species Research).
// Data-driven: change numbers / rewards in this file only. Thresholds: a number, or {pct} of a total (dex size, region
// dex, areas). Text: system_tasks.milestones.<id>.{title,rule} keys (Text Bot); strings here are fallbacks.
// Counters: 'count' = event counter in the save (store.milestones.counts[id]); 'derived' = recomputed from game state.
import { SPECIES } from '../ui/data.js?v=v0.2.79-alpha';
import { ELEMENT_FAMILY as SKILL_POOL_ALIAS } from '../battle/data/skills.js?v=v0.2.79-alpha';
import { CONN_NODES } from '../ui/connections.gen.js?v=v0.2.79-alpha';

export const TIER_NAMES = ['Bronze', 'Silver', 'Gold', 'Platinum'];
export const TYPES = ['fire', 'water', 'earth', 'wind', 'light', 'dark', 'mystic', 'normal']; // base type pools (src/ui/data.js)
export const typeOf = (el) => (TYPES.includes(el) ? el : SKILL_POOL_ALIAS[el] && TYPES.includes(SKILL_POOL_ALIAS[el]) ? SKILL_POOL_ALIAS[el] : 'normal');
// Regions 1-4 by species `found` text (DRAFT mapping, World Design to confirm). First match wins.
export const REGIONS = [
  { n: 1, name: 'Region 1', match: ['Brookhollow', 'Trail 1', 'Fernwick', 'Thornwood', 'Greystone'] },
  { n: 2, name: 'Region 2', match: ['Saltmere', 'Aurelith', 'Trail East', 'Coast Road'] },
  { n: 3, name: 'Region 3', match: ['Revival', 'Sunmeadow'] },
  { n: 4, name: 'Region 4', match: ['Frostspire'] },
];
export const regionOfSpecies = (sp) => REGIONS.find((r) => r.match.some((m) => String(sp?.found || '').includes(m)))?.n || 0;
export const SPECIES_INFO = Object.fromEntries(SPECIES.map((s) => [s.id, { region: regionOfSpecies(s), types: [...new Set((s.el || ['normal']).map(typeOf))], line: s.line || 1 }]));
export const TOTALS = { dex: SPECIES.length, areas: CONN_NODES.length, ...Object.fromEntries(REGIONS.map((r) => [`r${r.n}`, SPECIES.filter((s) => regionOfSpecies(s) === r.n).length])) };

// Reward ladder: Bronze small gold + basics, Silver ~1k + better capture items, Gold rare items + a cosmetic title,
// Platinum an earned-only charm (key item: no sell price, never stocked). Charm effects are PLACEHOLDERS (Gary).
const ladder = (charm, title, bronzeItem = { item: 'tonic_small', qty: 3 }) => [
  { coins: 200, items: [bronzeItem] },
  { coins: 1000, items: [{ item: 'dominance_crystal_plus', qty: 3 }] },
  { items: [{ item: 'tonic_large', qty: 3 }, { item: 'energy_tonic', qty: 2 }], title },
  { items: [{ item: charm, qty: 1 }] },
];
// RT Employee Benefits board points per tier (Gary, Oct 29 2026: Gold + Platinum of every milestone). ONE table to tune:
// index = tier (0 Bronze .. 3 Platinum). Paid into the board's own currency (company.pointsFree, src/systems/rt_benefits.js
// grantPoints), no new currency. Scale: the board earns 1 point per company ID level (~11 by ID 12) and every node rank
// costs 37 points in total, so 1 + 1 keeps it a bonus: a normal run reaches Gold on a handful of cards (~+5), Platinum is late.
export const BOARD_POINTS = [0, 0, 1, 1];
export const boardPointsFor = (t) => Math.max(0, Math.floor(Number(BOARD_POINTS[t]) || 0));
const cap = (s) => s[0].toUpperCase() + s.slice(1);
export const MILESTONES = [
  { id: 'catch_total', core: true, kind: 'derived', title: 'Catch', rule: 'Every Kilumen you catch or are given counts, your starter and gifts too.', tiers: [10, 50, 150, 400], rewards: ladder('catch_charm', 'Field Catcher', { item: 'dominance_crystal', qty: 5 }) },
  { id: 'dex_global', core: true, kind: 'derived', title: 'Kilindex', rule: 'Different species registered in the Kilindex (caught or given).', tiers: [10, { pct: 25 }, { pct: 60 }, { pct: 100 }], total: 'dex', rewards: ladder('lumen_charm', 'Kilindex Keeper') },
  ...REGIONS.map((r) => ({ id: `dex_r${r.n}`, kind: 'derived', region: r.n, title: `${r.name} Kilindex`, rule: `Different species from ${r.name} registered (caught or given).`, tiers: [5, { pct: 50 }, { pct: 80 }, { pct: 100 }], total: `r${r.n}`, rewards: ladder(`region_charm_${r.n}`, `${r.name} Naturalist`) })),
  ...TYPES.map((t) => ({ id: `type_${t}`, kind: 'derived', type: t, title: `${cap(t)} Tamer`, rule: `Kilumen of the ${t} type you catch or are given (every one counts, repeats too).`, tiers: [5, 20, 50, 120], rewards: ladder(`type_charm_${t}`, `${cap(t)} Tamer`) })),
  { id: 'trainers', core: true, kind: 'count', title: 'Trainer Wins', rule: 'Trainer battles won (Masters and rematches count; wild battles do not).', tiers: [10, 50, 150, 300], rewards: ladder('sparring_charm', 'Sparring Ace') },
  { id: 'explorer', core: true, kind: 'derived', title: 'Explorer', rule: 'Towns, roads and caves on the region map you have set foot in.', tiers: [5, { pct: 25 }, { pct: 60 }, { pct: 100 }], total: 'areas', rewards: ladder('explorers_compass', 'Pathfinder') },
  { id: 'levels', kind: 'derived', title: 'Trainer of Champions', rule: 'Kilumen on your team or in company storage at the level shown.', tiers: [{ lv: 20, n: 1 }, { lv: 30, n: 1 }, { lv: 45, n: 1 }, { lv: 45, n: 6 }], rewards: ladder('mentor_charm', 'Mentor') },
  { id: 'evolve', kind: 'derived', title: 'Evolve', rule: 'Evolutions you have seen, plus evolved Kilumen you own (gifts count).', tiers: [1, 5, 15, 40], rewards: ladder('bloom_charm', 'Bloom Watcher') },
  { id: 'merchant', kind: 'count', title: 'Merchant', rule: 'Gold earned from selling Kilumen and items.', tiers: [1000, 10000, 50000, 200000], rewards: ladder('merchant_charm', 'Merchant Prince') },
];
// Earned-only Platinum charms (key items in src/systems/items.js: unsellable, never in a shop). Effects PLACEHOLDER.
export const CHARMS = [...new Set(MILESTONES.map((m) => m.rewards[3].items[0].item))];
// Species Research: first 5 catches of each species give bonus XP to the new catch (PLACEHOLDER amounts).
export const RESEARCH = { catches: 5, xp: [60, 50, 40, 30, 80] };

export const emptyMilestones = () => ({ counts: {}, claimed: {}, popped: {}, areas: [], titles: [], evolved: 0 });

/** Derived values from game state: kilindex {seen, caught}, creatures [{species, level}], areas [ids], evolutions n. */
export function deriveValues({ kilindex = null, creatures = [], areas = [], evolutions = 0 } = {}) {
  const caught = kilindex?.caught || {}, v = { catch_total: 0, dex_global: 0, explorer: new Set(areas).size };
  for (const r of REGIONS) v[`dex_r${r.n}`] = 0;
  for (const t of TYPES) v[`type_${t}`] = 0;
  for (const [sp, n] of Object.entries(caught)) {
    const k = Math.max(0, Number(n) || 0); if (!k) continue;
    v.catch_total += k; v.dex_global++;
    const info = SPECIES_INFO[sp]; if (!info) continue;
    if (info.region) v[`dex_r${info.region}`]++;
    for (const t of info.types) v[`type_${t}`] += k;
  }
  v.levels = creatures.map((c) => c?.level || 1);
  v.evolve = Math.max(evolutions, 0) + creatures.filter((c) => (SPECIES_INFO[c?.species]?.line || 1) > 1).length;
  return v;
}

const withBoard = (rw, t) => { const n = boardPointsFor(t); return n && rw ? { ...rw, boardPoints: n } : rw; };

/** Pay board points for every claimed tier that has them (key ms:<id>:<tier>; rt.grantPoints never pays a key twice).
 *  Covers claims made before board points existed (old saves) and is safe to call on every load. -> points added */
export function creditBoardPoints(mb, rt) {
  if (!mb || typeof rt?.grantPoints !== 'function') return 0;
  let got = 0;
  for (const m of mb.table) { const c = mb.state.claimed[m.id] || 0; for (let t = 0; t < c; t++) if (boardPointsFor(t)) got += rt.grantPoints(boardPointsFor(t), `ms:${m.id}:${t}`); }
  return got;
}

export class MilestoneBook {
  constructor(saved = null, table = MILESTONES, totals = TOTALS) {
    this.table = table; this.totals = totals; this.byId = new Map(table.map((m) => [m.id, m]));
    const s = saved && typeof saved === 'object' ? JSON.parse(JSON.stringify(saved)) : {};
    this.state = { ...emptyMilestones(), ...s };
    for (const k of ['counts', 'claimed', 'popped']) if (!this.state[k] || typeof this.state[k] !== 'object' || Array.isArray(this.state[k])) this.state[k] = {};
    for (const k of ['areas', 'titles']) if (!Array.isArray(this.state[k])) this.state[k] = [];
    this.state.evolved = Math.max(0, Number(this.state.evolved) || 0);
  }
  toJSON() { return JSON.parse(JSON.stringify(this.state)); }
  bump(id, n = 1) { if (!this.byId.has(id) || !(n > 0)) return 0; return (this.state.counts[id] = (this.state.counts[id] || 0) + n); }
  /** never lower an event counter below a retro value (old saves) */
  floor(id, n) { if (this.byId.has(id) && n > (this.state.counts[id] || 0)) this.state.counts[id] = n; }
  area(map) { if (!map || this.state.areas.includes(map)) return false; this.state.areas.push(map); return true; }
  /** tier t target as a count (pct of a total rounds up, never below the previous tier + 1) */
  target(m, t) {
    const x = m.tiers[t];
    if (x && typeof x === 'object' && 'lv' in x) return x.n;
    if (x && typeof x === 'object' && 'pct' in x) { const tot = this.totals[m.total] || 0; const prev = t > 0 ? this.target(m, t - 1) : 0; return Math.max(prev + 1, Math.ceil(tot * x.pct / 100)); }
    return x;
  }
  value(m, d = {}, t = 0) {
    if (m.kind === 'count') return this.state.counts[m.id] || 0;
    if (m.id === 'levels') { const lv = m.tiers[Math.min(t, m.tiers.length - 1)].lv; return (d.levels || []).filter((l) => l >= lv).length; }
    return Math.max(0, Number(d[m.id]) || 0);
  }
  reached(m, d, t) { return this.value(m, d, t) >= this.target(m, t); }
  /** card view: tier = tiers claimed, next target / value, ready to claim, maxed, next reward, highest reached */
  row(m, d) {
    const claimed = this.state.claimed[m.id] || 0, maxed = claimed >= m.tiers.length, t = Math.min(claimed, m.tiers.length - 1);
    return { m, tier: claimed, tierName: TIER_NAMES[t], target: this.target(m, t), value: this.value(m, d, t), ready: !maxed && this.reached(m, d, t), maxed, reward: maxed ? null : withBoard(m.rewards[claimed], claimed), level: m.tiers[t]?.lv || null };
  }
  rows(d, { hideEmpty = true } = {}) { return this.table.map((m) => this.row(m, d)).filter((r) => !hideEmpty || r.m.core || r.tier > 0 || r.value > 0); }
  readyCount(d) { return this.table.filter((m) => this.row(m, d).ready).length; }
  /** tiers reached since last check -> [{m, tier}] (each celebrated once) */
  newlyReached(d) {
    const out = [];
    for (const m of this.table) {
      const p = this.state.popped[m.id] || 0; let t = p;
      while (t < m.tiers.length && this.reached(m, d, t)) t++;
      if (t > p) { this.state.popped[m.id] = t; out.push({ m, tier: t - 1 }); }
    }
    return out;
  }
  /** claim the next tier (in order) -> reward or null */
  claim(id, d) {
    const m = this.byId.get(id); if (!m) return null;
    const r = this.row(m, d); if (!r.ready) return null;
    this.state.claimed[id] = r.tier + 1;
    if (r.reward?.title && !this.state.titles.includes(r.reward.title)) this.state.titles.push(r.reward.title);
    return r.reward ? { ...r.reward, id, tier: r.tier } : r.reward;
  }
  /** claim every ready tier (repeats while a card has more than one tier ready) -> [rewards] */
  claimAll(d) { const out = []; for (let guard = 0; guard < 200; guard++) { const m = this.table.find((x) => this.row(x, d).ready); if (!m) break; out.push(this.claim(m.id, d)); } return out; }
}
