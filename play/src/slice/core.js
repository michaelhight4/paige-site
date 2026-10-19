import { fmtMoney } from '../fmt.js';
// core.js - tiny shared helpers. NO hidden globals: every hook gets (data, state, ...) explicitly.
// data  = { terms, occ, assets }   (parsed data/terms.json, occupations.json, assets.json)
// state = plain JSON object (see newState); hooks mutate the state passed in and return {ok, msg, ...}.
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

// seeded RNG (mulberry32); the 32-bit state lives in state.rng so runs are reproducible & saveable
export function rand(state) {
  state.rng = (state.rng + 0x6D2B79F5) | 0;
  let t = state.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const randRange = (state, a, b) => a + (b - a) * rand(state);
export const randInt = (state, a, b) => Math.floor(randRange(state, a, b + 1));
export function randNorm(state) {
  const u = Math.max(1e-9, rand(state)), v = rand(state);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export const pick = (state, arr) => arr[Math.floor(rand(state) * arr.length)];

// stat bar colour rule (green/orange/red bands): green 31-100, orange 13-30, red 0-12. Thresholds come from terms.json.
export function barColor(data, v) {
  const t = (data.terms && data.terms.bar_thresholds) || { green_min: 31, orange_min: 13 };
  return v >= t.green_min ? 'green' : v >= t.orange_min ? 'orange' : 'red';
}
export function money(data, n) {
  return fmtMoney(n, (data.terms && data.terms.currency) || '$');
}

export function newState(data, opts = {}) {
  const st = data.terms.start;
  const state = {
    v: 1, rng: (opts.seed ?? 12345) | 0, age: opts.age ?? st.age, month: 0, name: opts.name || 'Alex Doe', gender: 'x',
    cash: opts.cash ?? st.cash, debt: 0,
    stats: { ...st.stats, ...(opts.stats || {}) },
    licenses: [...(opts.licenses || st.licenses)],
    edu: { level: opts.edu || st.edu, degrees: {}, inSchool: null },
    job: null, partTime: null, military: null, careerYears: {}, collected: [], gigs: {}, gigsThisYear: {},
    assets: { property: [], car: [], jewelry: [], aircraft: [], boat: [], instrument: [], luxury: [], clothing: [] },
    invest: {}, market: {}, zoo: null, raceGarage: [], projects: [],
    shops: {}, auctions: {}, casino: { losses: 0, net: 0 }, flags: { fraud: 0 }, log: [], nextUid: 1,
  };
  for (const it of data.assets.investments.items) state.market[it.id] = it.price;
  return state;
}
export const log = (state, msg) => { state.log.unshift(`Age ${state.age}: ${msg}`); if (state.log.length > 60) state.log.length = 60; };
export const ok = (msg, extra = {}) => ({ ok: true, msg, ...extra });
export const fail = (msg, extra = {}) => ({ ok: false, msg, ...extra });

// Pay from cash; any shortfall becomes debt. Returns amount that went to debt.
export function spend(state, amt) {
  state.cash -= amt;
  if (state.cash < 0 && state.bkMode) { state.shortfall = (state.shortfall || 0) - state.cash; state.cash = 0; return 0; } // adults: the bankruptcy popup decides
  if (state.cash < 0) { state.debt += -state.cash; const d = -state.cash; state.cash = 0; return d; }
  return 0;
}
