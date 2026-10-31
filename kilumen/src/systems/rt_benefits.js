// RT Employee Benefits: the company XP skill tree (coder, Oct 23 2026). Gary, 1:01-1:02 PM CT: "the job board is the skill
// tree ui for leveling up company xp" / "yes its the company benifits bord" / "RT Employee Benifits" / "build into region one
// on the phone". Company XP only raises the company ID level (Gary: "company xp is just for your company level"); creature XP
// is never touched here.
//
// Data: data/rt_benefits.json (curve, XP sources, nodes, region cap). Save: the existing v2 `company` block
// (src/overworld/save.js): idLevel, pointsFree, board {nodeId: rank} (+ xp, xpClaims, added with zero defaults so old saves
// load as 0 XP). XP comes from the same events RITA (src/systems/company_voice.js, NOT edited) reacts to, observed the same
// way: scene.log flag / battle entries, systems.applyBattleResult (catch), a per-step Kilindex count diff. RITA's own diff
// on systems.company.idLevel / board then emits id_level_up / board_node: this module edits that SAME object in place.
// Saving: XP awards only mark the scene dirty (the overworld autosave already refuses mid battle / talk / cutscene); a rank
// bought from the phone menu calls scene.saveNow(), which is refused while a save lock is held (it then saves right after).
// Wiring: attachSystems (src/systems/index.js) -> attachRtBenefits; the phone tab is src/ui/rt_benefits_screen.js.
import { fmtMoney } from './config.js?v=v0.2.107-alpha';

export const COMPANY_DEFAULTS = () => ({ idLevel: 1, pointsFree: 0, board: {}, respecWeek: 0, xp: 0, xpClaims: {} });
const KI_KEY = 'kilindex_count'; // xpClaims slot: highest Kilindex log count already paid for (baseline on first look)
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const clone = (v) => (v == null || typeof v !== 'object' ? v : JSON.parse(JSON.stringify(v)));

// ---- pure rules (tests use these directly) ------------------------------------------------------------------------
/** Total company XP needed to reach ID level L (L >= 1). */
export function xpToReach(data, L) {
  const t = data?.curve?.xpTo || [0], step = num(data?.curve?.step, 1000), l = Math.max(1, Math.floor(L));
  return l <= t.length ? t[l - 1] : t[t.length - 1] + (l - t.length) * step;
}
/** Region cap (max ID level) for a region; null = no cap. */
export function regionCap(data, region = data?.region || 1) { const c = data?.regions?.[String(region)]?.maxIdLevel; return c ? Math.floor(c) : null; }
/**
 * Live region (region 2 build, Oct 23 2026): data.region, raised to the highest N in data.regionFlags {"N": flag} whose flag
 * is set. `flags` = a Set / array / {has()} of story flags. Region 2 opens with beat_master_fernwick (no other gating).
 */
export function regionForFlags(data, flags) {
  let r = num(data?.region, 1); const has = flags?.has ? (f) => flags.has(f) : Array.isArray(flags) ? (f) => flags.includes(f) : () => false;
  for (const [k, f] of Object.entries(data?.regionFlags || {})) if (/^\d+$/.test(k) && typeof f === 'string' && has(f)) r = Math.max(r, Number(k));
  return r;
}
/** ID level for an XP total (capped by the region). */
export function levelForXp(data, xp, region = data?.region || 1) {
  const cap = regionCap(data, region) || 999;
  let L = 1; while (L < cap && xp >= xpToReach(data, L + 1)) L++;
  return L;
}
/** Most ranks of a node buyable in a region. */
export function regionMaxRank(node, region = 1) {
  const m = node?.maxRankByRegion; if (!m) return node?.ranks?.length || 0;
  let best = 0; for (const [r, v] of Object.entries(m)) if (Number(r) <= region) best = Math.max(best, num(v));
  return Math.min(best, node.ranks?.length || 0);
}
/** First region where a node can be bought at all. */
export function unlockRegionOf(node) {
  if (node?.unlockRegion) return node.unlockRegion;
  const m = node?.maxRankByRegion || {}; const r = Object.keys(m).map(Number).sort((a, b) => a - b).find((k) => num(m[k]) > 0);
  return r || 1;
}
/**
 * Node view for the tree: {id, rank, max, regionMax, next, state, reason, needId, unlockRegion}.
 * state: 'owned' (all ranks open in this region bought), 'available' (next rank can be bought now), 'locked'.
 * reason (locked): 'region' (needs a later region), 'id' (ID level too low), 'points' (not enough points).
 */
export function nodeState(data, company, node, region = data?.region || 1, flags = null) {
  const rank = Math.max(0, Math.floor(num(company?.board?.[node.id]))), max = node.ranks?.length || 0, regionMax = regionMaxRank(node, region);
  const next = rank < max ? node.ranks[rank] : null, idLevel = num(company?.idLevel, 1), pts = num(company?.pointsFree);
  const out = { id: node.id, branch: node.branch, rank, max, regionMax, next, needId: next ? num(next.minIdLevel, 1) : null, cost: next ? num(next.cost, 1) : null, unlockRegion: unlockRegionOf(node) };
  if (rank >= max || (rank > 0 && rank >= regionMax)) return { ...out, state: 'owned', reason: rank >= max ? 'maxed' : 'region' };
  if (rank >= regionMax) return { ...out, state: 'locked', reason: 'region', unlockRegion: Math.max(region + 1, out.unlockRegion) };
  // regions 5-6 (dev/r56-wiring): a promotion unlocks the station key card node (requiresFlag promoted_id14 / promoted_id16)
  if (node.requiresFlag && !(flags?.has ? flags.has(node.requiresFlag) : Array.isArray(flags) && flags.includes(node.requiresFlag))) return { ...out, state: 'locked', reason: 'promotion', needFlag: node.requiresFlag };
  if (idLevel < out.needId) return { ...out, state: 'locked', reason: 'id' };
  if (pts < out.cost) return { ...out, state: 'locked', reason: 'points' };
  return { ...out, state: 'available', reason: null };
}
/** Fill a company block in place (same object, so RITA's diff keeps watching it). `base` = the store's v2 company block. */
export function ensureCompany(co, base = null) {
  const d = COMPANY_DEFAULTS();
  if (base && typeof base === 'object') for (const [k, v] of Object.entries(base)) if (!(k in co)) co[k] = clone(v);
  for (const [k, v] of Object.entries(d)) if (co[k] == null || typeof co[k] !== typeof v) co[k] = v;
  co.xp = Math.max(0, num(co.xp)); co.idLevel = Math.max(1, Math.floor(num(co.idLevel, 1))); co.pointsFree = Math.max(0, Math.floor(num(co.pointsFree)));
  return co;
}

// ---- runtime ---------------------------------------------------------------------------------------------------------
export class RtBenefits {
  /** scene: overworld (or stub); sys: scene.systems; data: data/rt_benefits.json; opts: {region} */
  constructor(scene, sys, data = null, opts = {}) {
    this.scene = scene; this.sys = sys; this.data = null; this.opts = opts;
    this.company = ensureCompany(sys.company || (sys.company = {}), scene?.store?.extra?.company);
    this.pending = []; this.listeners = new Set();
    if (data) this.setData(data);
  }
  setData(data) {
    this.data = data;
    this.region = num(this.opts.region, 0) || regionForFlags(data, this.scene?.flags);
    this.syncLevel();
    const q = this.pending; this.pending = []; for (const f of q) f();
  }
  /** Re-read the live region from the story flags (opts.region pins it). Region up -> new cap -> syncLevel. -> changed */
  updateRegion() {
    if (!this.data || num(this.opts.region, 0)) return false;
    const r = regionForFlags(this.data, this.scene?.flags);
    if (r === this.region) return false;
    this.region = r; this._emit({ type: 'region', region: r }); this.syncLevel();
    return true;
  }
  get nodes() { return this.data?.nodes || []; }
  get branches() { return this.data?.branches || []; }
  node(id) { return this.nodes.find((n) => n.id === id) || null; }
  state(id) { const n = this.node(id); return n ? nodeState(this.data, this.company, n, this.region, this.scene?.flags) : null; }
  cap() { return regionCap(this.data, this.region); }
  /** {idLevel, xp, xpInto, xpSpan, toNext, frac, capped, points, cap} for the header bar. */
  progress() {
    const co = this.company, L = co.idLevel, cap = this.cap(), capped = !!cap && L >= cap;
    const lo = xpToReach(this.data, L), hi = xpToReach(this.data, L + 1), span = Math.max(1, hi - lo), into = Math.max(0, co.xp - lo);
    return { idLevel: L, xp: co.xp, xpInto: capped ? span : Math.min(span, into), xpSpan: span, toNext: capped ? 0 : Math.max(0, hi - co.xp), frac: capped ? 1 : Math.min(1, into / span), capped, points: co.pointsFree, cap };
  }
  on(f) { this.listeners.add(f); return () => this.listeners.delete(f); }
  _emit(ev) { for (const f of this.listeners) { try { f(ev); } catch (e) { console.error('rt_benefits listener:', e); } } }

  /** Raise idLevel to what the XP pays for (never lowers it); each level gives pointsPerLevel. -> levels gained */
  syncLevel() {
    if (!this.data) return 0;
    const co = this.company, target = levelForXp(this.data, co.xp, this.region), ppl = Math.max(0, Math.floor(num(this.data.pointsPerLevel, 1)));
    let gained = 0;
    while (co.idLevel < target) { co.idLevel++; co.pointsFree += ppl; gained++; this._emit({ type: 'level', level: co.idLevel, points: co.pointsFree }); }
    return gained;
  }
  /** Award company XP for a source. once-sources are claimed per save. -> XP actually added */
  award(src, key = null, amount = null) {
    if (!this.data) { this.pending.push(() => this.award(src, key, amount)); return 0; }
    const def = this.data.sources?.[src]; if (!def) return 0;
    const xp = amount != null ? amount : typeof def.xp === 'object' ? num(def.xp?.[String(key)]) : num(def.xp);
    if (!(xp > 0)) return 0;
    const co = this.company, claim = key != null ? `${src}:${key}` : src;
    if (def.once) { if (co.xpClaims[claim]) return 0; co.xpClaims[claim] = 1; }
    const cap = this.cap(), max = cap ? xpToReach(this.data, cap) : Infinity, before = co.xp;
    co.xp = Math.min(max, co.xp + xp);
    const got = co.xp - before;
    this.scene._dirty = true; // saved by the normal autosave: refused mid battle / talk / cutscene (overworld saveLockReason)
    this.scene.log?.push?.({ tick: this.scene.tick, type: 'companyXp', src, key, xp: got, total: co.xp });
    this._emit({ type: 'xp', src, key, xp: got, total: co.xp });
    this.syncLevel();
    return got;
  }

  /** Grant board points (company.pointsFree, the currency buy() spends) once per key (Tasks > Milestones, Oct 29 2026).
   *  The key is kept in company.xpClaims as `pts:<key>`, so a reload / re-run never pays twice. -> points added */
  grantPoints(n, key) {
    const pts = Math.max(0, Math.floor(num(n))); if (!pts || key == null) return 0;
    const co = this.company, claim = `pts:${key}`;
    if (co.xpClaims[claim]) return 0;
    co.xpClaims[claim] = pts; co.pointsFree += pts;
    this.scene._dirty = true;
    this.scene.log?.push?.({ tick: this.scene.tick, type: 'benefitPoints', key, points: pts, total: co.pointsFree });
    this._emit({ type: 'points', key, points: pts, total: co.pointsFree });
    return pts;
  }

  // ---- observers (same sources as RITA) --------------------------------------------------------------------------------
  onLog(e) {
    if (!e || !e.type) return;
    if (e.type === 'battle' && e.won !== false && e.npc) this.award('trainer_first_win');
    else if (e.type === 'flag' && e.on !== false) this.onFlag(e.flag);
  }
  onFlag(flag) {
    if (!this.data) { this.pending.push(() => this.onFlag(flag)); return; }
    if (Object.values(this.data.regionFlags || {}).includes(flag)) this.updateRegion(); // before the award: the new cap applies
    const S = this.data.sources || {}, alias = S.main_quest?.done_on_flag?.[flag];
    if (alias) { this.award('main_quest', alias); return; }
    for (const name of ['main_quest', 'rival_beaten', 'master_beaten']) {
      const re = S[name]?.flag_re, m = re && new RegExp(re).exec(flag || '');
      if (m) { this.award(name, m[1]); return; }
    }
  }
  onBattleResult(res) { if (res?.outcome === 'caught' && res.caught?.species) this.award('first_catch'); }
  /** Per-step: new Kilindex logs (+ milestones). First look on a save without a baseline = baseline only (old saves: 0 XP). */
  diff() {
    if (this.data) this.updateRegion(); // a loaded save / a flag set without a log entry
    const ki = this.sys?.kilindex; if (!ki || !this.data) return;
    const n = Math.floor(num(ki.caughtCount)), claims = this.company.xpClaims;
    if (claims[KI_KEY] == null) {
      claims[KI_KEY] = n;
      if (n >= 2) claims.first_catch = 1; // an old save that already caught something: no "first catch" later
      return;
    }
    const prev = num(claims[KI_KEY]);
    if (n <= prev) return;
    claims[KI_KEY] = n;
    const ms = this.data.sources?.kilindex_milestone?.xp || {};
    const perLog = this.effect('asset_logging_bonus'); // region 2 perk: coins per new log
    for (let c = prev + 1; c <= n; c++) {
      this.award('kilindex_new', c); if (ms[String(c)] != null) this.award('kilindex_milestone', c);
      if (perLog > 0 && this.sys?.wallet?.add) { this.sys.wallet.add(Math.floor(perLog)); this._emit({ type: 'log_bonus', count: c, coins: Math.floor(perLog) }); }
    }
  }

  // ---- buying ------------------------------------------------------------------------------------------------------------
  canBuy(id) { const s = this.state(id); return !!s && s.state === 'available'; }
  /** Buy the next rank of a node (menu only). Saves through scene.saveNow() (refused while locked). -> {ok, reason?, rank, saved} */
  buy(id) {
    const s = this.state(id); if (!s) return { ok: false, reason: 'unknown' };
    if (s.state !== 'available') return { ok: false, reason: s.reason || s.state };
    const co = this.company;
    co.pointsFree -= s.cost;
    co.board[id] = s.rank + 1;
    const node = this.node(id); // key cards: the node grants a story flag (saved with the flags, opens locked_warps unlock_flag)
    if (node?.grantFlag) { if (typeof this.scene.setFlag === 'function') this.scene.setFlag(node.grantFlag, true); else this.scene.flags?.add?.(node.grantFlag); }
    this.scene.log?.push?.({ tick: this.scene.tick, type: 'benefitRank', node: id, rank: s.rank + 1, cost: s.cost });
    this.scene._dirty = true;
    this._emit({ type: 'rank', node: id, rank: s.rank + 1 });
    const saved = typeof this.scene.saveNow === 'function' ? !!this.scene.saveNow() : false;
    return { ok: true, rank: s.rank + 1, cost: s.cost, saved };
  }
  /** Effect value of a node at its current rank (ranks[rank-1].value), 0 when not owned. */
  effect(id) { const n = this.node(id), r = num(this.company.board?.[id]); return n && r > 0 ? num(n.ranks?.[r - 1]?.value) : 0; }
  /** Points ledger (audit): earned = ID levels x pointsPerLevel + every task / quest / milestone / event / tree grant
   *  (xpClaims `pts:<key>`); spent = the cost of every owned rank; kept = key-card ranks a reset leaves in place.
   *  Invariant on a clean save: pointsFree + spent === earned. */
  ledger() {
    const co = this.company, ppl = Math.max(0, Math.floor(num(this.data?.pointsPerLevel, 1)));
    const fromLevels = Math.max(0, co.idLevel - 1) * ppl;
    const grants = {}; let fromTasks = 0;
    for (const [k, v] of Object.entries(co.xpClaims || {})) if (k.startsWith('pts:')) { const n = Math.max(0, Math.floor(num(v))); grants[k.slice(4)] = n; fromTasks += n; }
    let spent = 0, kept = 0;
    for (const n of this.nodes) {
      const r = Math.max(0, Math.floor(num(co.board?.[n.id]))); let c = 0;
      for (let i = 0; i < r && i < (n.ranks?.length || 0); i++) c += num(n.ranks[i].cost, 1);
      spent += c; if (n.grantFlag) kept += c;
    }
    return { fromLevels, fromTasks, grants, earned: fromLevels + fromTasks, spent, kept, free: co.pointsFree, refundable: spent - kept };
  }
  /** Reset (respec, dev/rt-respec Oct 31 2026, Gary: "just add resets"): FREE. Every rank goes back and its exact cost is
   *  refunded into pointsFree (points from ID levels and from tasks alike: the refund is what was spent, so nothing is lost
   *  or minted). Key-card nodes (grantFlag) stay: they opened story doors. Saves through scene.saveNow(). -> {ok, refunded} */
  respec() {
    if (!this.data || this.data.respec?.supported === false) return { ok: false, reason: 'unsupported' };
    const co = this.company; let refunded = 0, ranks = 0;
    for (const n of this.nodes) {
      if (n.grantFlag) continue;
      const r = Math.max(0, Math.floor(num(co.board?.[n.id]))); if (!r) continue;
      for (let i = 0; i < r && i < (n.ranks?.length || 0); i++) refunded += num(n.ranks[i].cost, 1);
      ranks += r; delete co.board[n.id];
    }
    if (!ranks) return { ok: false, reason: 'nothing' };
    co.pointsFree += refunded; co.respecs = num(co.respecs) + 1;
    this.scene.log?.push?.({ tick: this.scene.tick, type: 'benefitRespec', refunded, ranks });
    this.scene._dirty = true;
    this._emit({ type: 'respec', refunded, points: co.pointsFree });
    const saved = typeof this.scene.saveNow === 'function' ? !!this.scene.saveNow() : false;
    return { ok: true, refunded, ranks, saved };
  }
}

/** Hall Hazard Pay targets: hall interiors ('<town>_hall_int.<id>') and the helper / master classes. */
export const isHallTrainer = (t = {}) => /_hall_int\./.test(String(t.id || '')) || t.class === 'helper' || t.class === 'master';

/** Load data/rt_benefits.json (browser). Node tests pass the data in. */
export async function loadRtBenefitsData(url = new URL('../../data/rt_benefits.json', import.meta.url)) {
  const r = await fetch(url); if (!r.ok) throw new Error(`rt_benefits.json ${r.status}`); return r.json();
}

/**
 * Wire into a scene with attached systems. opts: {data, region, config (URLSearchParams | {rtb})}.
 * Browser: loads the json itself. Node without opts.data: does nothing (stub scenes in other tests stay untouched).
 * ?rtb=0 turns it off.
 */
export function attachRtBenefits(scene, sys = scene?.systems, opts = {}) {
  const q = opts.config, off = (q?.get ? q.get('rtb') : q?.rtb) === '0';
  if (!scene || !sys || off) return null;
  const browser = typeof window !== 'undefined' && typeof fetch === 'function';
  if (!opts.data && !browser) return null;
  const rt = new RtBenefits(scene, sys, opts.data || null, opts);
  sys.rtBenefits = rt;
  if (!opts.data) loadRtBenefitsData(opts.url).then((d) => rt.setData(d)).catch((e) => console.warn('rt_benefits:', e?.message || e));

  // save: the company block rides with the systems blocks (a new game's systems.company is not the store's object)
  const blocks = sys.saveBlocks?.bind(sys);
  if (blocks) sys.saveBlocks = () => ({ ...blocks(), company: rt.company });
  // observers
  if (Array.isArray(scene.log)) {
    const log = scene.log, push = log.push.bind(log);
    log.push = (...items) => { const r = push(...items); for (const e of items) { try { rt.onLog(e); } catch (err) { console.error('rt_benefits log:', err); } } return r; };
  }
  if (typeof sys.applyBattleResult === 'function') {
    const apply = sys.applyBattleResult.bind(sys);
    sys.applyBattleResult = (res, ...a) => { const r = apply(res, ...a); try { rt.onBattleResult(res); } catch (err) { console.error('rt_benefits catch:', err); } return r; };
  }
  if (typeof scene.step === 'function') {
    const step = scene.step.bind(scene);
    scene.step = (...a) => { const r = step(...a); try { rt.diff(); } catch (err) { console.error('rt_benefits diff:', err); } return r; };
  }
  // effects: rt_payout (extra % on trainer prize money) + hall_hazard_pay (hall / Master fights only); shop.js / shops.json
  // untouched. copay_coverage is read by heal.js (sys.rtBenefits.effect), asset_logging_bonus by diff().
  if (typeof sys.awardBattleMoney === 'function') {
    const award = sys.awardBattleMoney.bind(sys);
    sys.awardBattleMoney = (trainer, ...a) => {
      const hall = isHallTrainer(trainer), pct = rt.effect('rt_payout') + (hall ? rt.effect('hall_hazard_pay') : 0);
      const r = award(trainer, ...a), bonus = r && r.amount > 0 && pct > 0 ? Math.floor(r.amount * pct) : 0;
      if (!bonus) return r;
      sys.wallet?.add?.(bonus);
      const amount = r.amount + bonus;
      return { ...r, amount, bonus, vars: { ...(r.vars || {}), total: fmtMoney(amount) } };
    };
  }
  // the phone tab (browser only): installs once the UI is up (sys.ui is set by installSystemsScreens)
  if (browser) {
    let tries = 0;
    const tryUi = () => {
      const ui = sys.ui || globalThis.kilumen?.ui;
      if (ui?.open) import('../ui/rt_benefits_screen.js?v=v0.2.107-alpha').then((m) => m.installRtBenefitsScreen(ui, rt)).catch((e) => console.error('rt_benefits ui:', e));
      else if (++tries < 240) setTimeout(tryUi, 250);
    };
    tryUi();
  }
  return rt;
}
