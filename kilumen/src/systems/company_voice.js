// Company voice (Oct 23 2026, coder). Gary 12:19 PM CT: reference the "employee model" and the way a corporate AI
// "jumps in to talk to you when you've completed or discovered something" (STRUCTURE ONLY: no names, lines, art or voice
// copied). Gary 12:20 / 12:21 / 12:22 PM CT: it is inherently sarcastic, cares only about company asset value, and always
// calls the player by the bare 6-digit employee number ({employee_id}, src/systems/employee_id.js), never by name.
// Design: design/company_voice.md. Data: data/company_voice.json (event -> line key, tier, priority, cooldown, once).
// Lines: system_company_voice.<line> in text/overworld_lines.json (Text Bot; brief data/textbot_requests_company_voice.md);
// FALLBACK below until Text Bot's keys land.
//
// DEFAULT ON for the region 1 release (Gary 12:45 PM CT Oct 23 2026: "Yes, ship RITA in region 1"); ?cv=0 turns it off
// (attachCompanyVoice() then returns null, nothing loaded or wrapped). Release scope: cfg.maxRegion (data) hides every line
// tagged with a later region and limits Kilindex milestone counts / quest ids to the shipped regions (regionList()).
// Events are observed, not pushed by other files: scene.log entries (flag / areaSign / evolve / battle), a wrap of
// systems.applyBattleResult (first catch) and per-tick diffs of the Kilindex count and the company block (ID level,
// Benefits Board ranks). The only edits elsewhere: one attach line in main.js, one Options row in ui.js, the
// {employee_id} text var (overworld.js textVars) and the employee number in save.js.
// Rules: max 1 message per burst (highest priority wins), global cooldown, short queue, never while a script / dialogue /
// battle / phone UI / fade / evolution / save lock is up (a message on screen hides at once if one starts), checkpoint
// save right before it shows and no save while it is up (saveGuards 'company_voice'). A / F / tap dismisses, else it
// auto-hides. Mode Full / Milestones only / Off (Options row, saved in localStorage).
// Music duck (Oct 23 2026; Gary 1:41 PM CT: "music should turn down to let her talk"): while the strip is up the music bus
// is ducked through audio.duck('company_voice', ...) (src/audio/audio.js; settings cfg.duck). Released on every hide
// (done / skip / timer / interrupt by battle, dialogue, cutscene / mode off), on a scene change (warpStart) and after
// cfg.duck.maxMs at the latest, so the music is never left low. No audio, muted or music 0 = no-op.
import { employeeIdOf } from './employee_id.js?v=v0.2.83-alpha';

export const FALLBACK = {
  speaker: 'RITA',
  first_catch: ['Good job {employee_id}! First asset acquired.', 'Company asset value: up from nothing.'],
  kilindex_new: ['Good job {employee_id}! New creatures help boost company asset value!'], // Gary's model line, verbatim
  kilindex_milestone: ['{employee_id}: {count} kinds on file. Asset value is up.', "You're still a number. A busier one."],
  area_new: ['{employee_id}: {area} logged.', 'More land for the asset map. Thrilling.'],
  first_evolution: ['{employee_id}: {creature} became {new}.', 'Bigger asset, bigger value. Your pay: same.'],
  trainer_first_win: ['{employee_id}: first win on file.', 'Winning keeps our assets looking pricey.'],
  rival_beaten: ['{employee_id}: you beat {trainer}.', 'The assets did the work. Noted anyway.'],
  master_beaten: ['{employee_id}: {master} Master beaten.', 'Asset value up. The board is delighted. Not with you.'],
  id_level_up: ['{employee_id}: Employee ID level {level}.', "Congratulations. You're a pricier number now."],
  board_node: ['{employee_id}: Benefits Board perk filed.', 'Happy staff move assets faster. Allegedly.'],
  quest_done: ['{employee_id}: task closed: {quest}.', 'Value delivered. Back to work.'],
  rita_install: [], // RITA install (Gary 3:58 PM CT Oct 23 2026): no line of its own; the strip is the Trainer 1 intro alone
  crystal_resupply: ['{employee_id}: Crystal stock depleted. Revival Tech is resupplying you.', 'The cost will reflect on your paycheck.'], // battle end only, flavour (src/systems/crystal_resupply.js)
};

const DUCK_ID = 'company_voice';
const cap = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const getPath = (o, path) => path.split('.').reduce((v, k) => (v == null ? v : v[k]), o);

/** Mode store (localStorage or a test stub). */
// Trainer 1 (Gary 3:31 PM CT Oct 23 2026): "the very first time rita ever talks to you she needs to read your number and
// say 'yeah no that uses too much company time, youre now trainer 1'" + "She calls me Trainer 1 from then on". Her very
// first strip (any event) gets these 2 pages in front; scene.seen[TRAINER1_KEY] (saved with the save, set after the
// pre-strip checkpoint so the save rule holds) makes it once only. Saves without the key (players who already met RITA)
// get it once on their next line. After that RITA's {employee_id} is 'Trainer 1' (text + voice); the real number stays in
// the save (company.employeeId) and in Overworld.textVars for any other text. Text Bot key: system_company_voice.rita_trainer1
// (data/textbot_requests_trainer1.md); until then this default is used (the voice clips are built from it).
export const TRAINER1_KEY = 'cv#trainer1', TRAINER1_NAME = 'Trainer 1', TRAINER1_LINE = 'rita_trainer1';
export const TRAINER1_INTRO = ['{employee_id}...', "Yeah, no. That uses too much company time. You're now Trainer 1."];
/** What RITA calls the player: 'Trainer 1' once the intro has run, else the 6-digit number. */
// RITA install (Gary 3:58 / 3:59 PM CT Oct 23 2026: the lab tech installs RITA during the tutorial, before the starter
// pick). cfg.start_after_flag = this flag: nothing of hers fires before it. Old saves that already met her (Trainer 1 intro
// seen) or are past the starter get it set automatically, no replay (started()).
export const RITA_INSTALLED = 'rita_installed';
export function ritaIdOf(scene) { return scene?.seen?.[TRAINER1_KEY] ? TRAINER1_NAME : employeeIdOf(scene); }

export function loadMode(storage, cfg) {
  try { const m = JSON.parse(storage?.getItem(cfg.settings.storage_key) || 'null')?.mode; if (cfg.settings.modes.includes(m)) return m; } catch { /* bad json */ }
  return cfg.settings.default_mode;
}

export class CompanyVoice {
  /**
   * @param scene Overworld (or a stub: flags Set, seen {}, log [], busy, dialog, saveLockReason(), checkpoint(), ...)
   * @param cfg   data/company_voice.json
   * @param opts  {storage, now(), dom (document|null), ui () => ui}
   */
  constructor(scene, cfg, opts = {}) {
    this.scene = scene; this.cfg = cfg; this.opts = opts;
    this.storage = opts.storage ?? null;
    this.now = opts.now || (() => (typeof scene.ms === 'number' ? scene.ms / (scene.worldSpeed > 1 ? scene.worldSpeed : 1) : Date.now())); // real-time pacing under dev world speed
    this.rng = opts.rng || Math.random; // injectable for tests
    this.mode = loadMode(this.storage, cfg);
    this.burst = []; this.queue = []; this.current = null; this.shownLog = [];
    this.lastHideAt = -Infinity; this.lastEmitAt = {};
    this._prevA = false; this._kiCount = undefined; this._idLevel = undefined; this._board = undefined;
    this.maxRegion = cfg.maxRegion == null ? Infinity : Number(cfg.maxRegion); // no maxRegion = whole game
    this._ducked = null; // {at} while we hold the music duck
  }

  // ---- music duck (audio.duck / unduck, src/audio/audio.js) ---------------------------------------------------------
  audio() { return (this.opts.audio ? this.opts.audio() : this.scene.audio) || null; }
  duckCfg() { const d = this.cfg.duck; return d && Number(d.music) < 1 ? d : null; }
  duckOn() {
    const d = this.duckCfg(), a = this.audio();
    if (this._ducked || !d || typeof a?.duck !== 'function') return false;
    try { if (!a.duck(DUCK_ID, Number(d.music), d.fadeInMs ?? 250, d.maxMs ?? 20000)) return false; } catch (e) { console.error('company voice duck:', e); return false; }
    this._ducked = { at: this.now() };
    return true;
  }
  duckOff(why = 'hide') {
    if (!this._ducked) return false;
    this._ducked = null; this.lastUnduckWhy = why;
    const d = this.cfg.duck || {};
    try { this.audio()?.unduck?.(DUCK_ID, d.fadeOutMs ?? 600, true); } catch (e) { console.error('company voice duck:', e); }
    return true;
  }

  // ---- release scope (maxRegion) ------------------------------------------------------------------------------------
  /** Region of a line entry ({region: 1} / 'region_1'); untagged -> 0 (always allowed). */
  static lineRegion(v) { const r = v && !Array.isArray(v) ? v.region : null; const n = Number(String(r ?? '').replace(/\D/g, '')); return Number.isFinite(n) ? n : 0; }
  /** Union of a per-region list (e.g. counts_by_region / keys_by_region) for regions <= maxRegion; null = no list (open). */
  regionList(byRegion) {
    if (!byRegion) return null;
    const out = [];
    for (const [r, xs] of Object.entries(byRegion)) if (Number(r) <= this.maxRegion) out.push(...xs);
    return out;
  }
  /** Kilindex counts that fire in this release. */
  milestoneCounts() { const ev = this.cfg.events.kilindex_milestone; return this.regionList(ev?.counts_by_region) ?? ev?.counts ?? []; }

  // ---- settings ---------------------------------------------------------------------------------------------------
  setMode(m) {
    if (!this.cfg.settings.modes.includes(m)) return this.mode;
    this.mode = m;
    try { this.storage?.setItem(this.cfg.settings.storage_key, JSON.stringify({ mode: m })); } catch { /* storage full */ }
    if (m === 'off') { this.burst = []; this.queue = []; if (this.current) this.hide('off'); }
    return m;
  }
  cycleMode() { const ms = this.cfg.settings.modes; return this.setMode(ms[(ms.indexOf(this.mode) + 1) % ms.length]); }
  modeLabel() { return this.cfg.settings.labels?.[this.mode] || this.mode; }

  // ---- gates ------------------------------------------------------------------------------------------------------
  /** Why nothing may show right now (null = clear). Our own save guard is ignored. */
  blockedReason() {
    const s = this.scene;
    if (s.busy) return 'script';
    if (s.dialog?.active) return 'dialogue';
    if (s.fade) return 'fade';
    if (s.intro?.picker?.active) return 'starter_pick';
    if (s.evolution?.running || s.evolution?.queue?.length) return 'evolution';
    const ui = this.opts.ui?.(); if (ui?.active) return 'ui';
    this._self = true;
    try { const r = s.saveLockReason?.(); if (r && r !== 'company_voice') return r; } finally { this._self = false; }
    return null;
  }
  started() {
    const f = this.cfg.start_after_flag, s = this.scene, F = s.flags;
    if (!f || F?.has(f)) return true;
    if (f === RITA_INSTALLED && F?.has('got_starter')) { F.add(f); s._dirty = true; return true; } // old save: auto-installed
    return false;
  }

  // ---- events -----------------------------------------------------------------------------------------------------
  /** -> true if the event was accepted into the current burst. ctx: {key, count, area, creature, new, trainer, master, quest, level, node, tier} */
  emit(name, ctx = {}) {
    const ev = this.cfg.events[name];
    if (!ev || this.mode === 'off') return false;
    const keys = this.regionList(ev.keys_by_region); // release scope: e.g. region 1 quest_done = the promotion task only
    if (keys && !keys.includes(ctx.key)) return false;
    if (!this.started()) {
      // mq_brookhollow_promotion completes at the moment the starter is received (RITA's switch-on): hold it, tick()
      // replays it once got_starter is set, so it joins that burst (normal priority rules).
      if (ev.defer_until_start?.includes(ctx.key)) (this._preStart ||= []).push([name, ctx]);
      return false;
    }
    const tier = ctx.tier || ev.tier;
    if (this.mode === 'milestones' && tier !== 'milestone') return false;
    const s = this.scene, seen = (s.seen ||= {});
    const onceKey = ev.once === 'event' ? `cv#${name}` : ev.once === 'key' ? `cv#${name}#${ctx.key ?? ''}` : null;
    if (onceKey && seen[onceKey]) return false;
    const t = this.now();
    if (ev.cooldown_ms && t - (this.lastEmitAt[name] ?? -Infinity) < ev.cooldown_ms) return false;
    this.lastEmitAt[name] = t;
    if (onceKey) { seen[onceKey] = true; s._dirty = true; } // marked now: a burst loser never comes back later
    if (ev.direct) { this.queue.push({ name, ctx, priority: ev.priority || 0, at: t }); return true; } // own queue slot (crystal_resupply): never knocks a once-only line out of a burst
    this.burst.push({ name, ctx, priority: ev.priority || 0, at: t, order: this.burst.length });
    this._burstAt = t;
    return true;
  }

  /** Text for an event: Text Bot key first, else the code fallback. Max cfg.timing.max_pages pages. */
  pages(name, ctx = {}) {
    const ev = this.cfg.events[name] || {}, L = this.scene.lines?.system_company_voice;
    const keys = [], base = ev.line || name;
    if (ev.per_count_lines && ctx.count != null) keys.push(`${base}_${ctx.count}`);
    // specific key first (Oct 23 2026): <base>_<town | ron_<n> | map id | quest id>, then the generic base, then FALLBACK.
    // ev.specific true = ctx.key as is; a string = prefix (rival: 'ron_' so ron_1 is never read as numeric variant 1).
    if (ev.specific && ctx.key != null && ctx.key !== '') keys.push(`${base}_${typeof ev.specific === 'string' ? ev.specific : ''}${ctx.key}`);
    keys.push(base);
    let raw = null;
    const exclude = ev.per_count_lines ? (ev.counts || []) : []; // kilindex_milestone_10 is a count key, not variant 10
    let key = null;
    for (const k of keys) { raw = this.pickVariant(k, k === (ev.line || name) ? exclude : []); if (raw) { key = this._pickedKey || k; break; } }
    if (!raw) key = null; // FALLBACK text has no voice clip (RITA voice: silent text)
    raw ||= FALLBACK[ev.line || name] || ['{employee_id}: noted.'];
    const vars = { ...(this.scene.textVars?.() || {}), employee_id: ritaIdOf(this.scene), ...ctx };
    const fill = (p) => String(p).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
    this.lastPick = { key, raw: raw.slice(0, this.cfg.timing.max_pages), vars }; // RITA voice (src/systems/rita_voice.js): exact variant key + unfilled pages
    return raw.slice(0, this.cfg.timing.max_pages).map(fill);
  }
  /**
   * Line variants (Gary 12:29 PM CT, ~4 versions per message): base key plus <base>_2.._<base>_9 that exist in
   * system_company_voice (e.g. kilindex_milestone_10 -> kilindex_milestone_10_2). Only a numeric suffix directly on the base
   * counts; for the generic kilindex_milestone base the configured counts (10, 25, ...) are excluded, so
   * kilindex_milestone_10 is never a variant of it (per-count keys are looked up explicitly in pages() and have their own
   * variants kilindex_milestone_10_2 ...). Random pick, never the same index as last time for that base; last index is kept
   * in the save's seen map as cv#last#<base> (old saves without it just pick freely). -> pages array or null.
   */
  pickVariant(base, exclude = []) {
    const L = this.scene.lines?.system_company_voice, get = (k) => { const v = L?.[k]; if (CompanyVoice.lineRegion(v) > this.maxRegion) return null; const r = Array.isArray(v) ? v : v?.pages || null; return r?.length ? r : null; };
    const opts = [];
    if (get(base)) opts.push({ i: 1, raw: get(base) });
    const pre = base + '_';
    for (const k of Object.keys(L || {})) {
      if (!k.startsWith(pre) || !/^\d+$/.test(k.slice(pre.length))) continue;
      const n = Number(k.slice(pre.length)); if (n < 2 || exclude.includes(n)) continue;
      const r = get(k); if (r) opts.push({ i: n, raw: r });
    }
    opts.sort((a, b) => a.i - b.i);
    this._pickedKey = null;
    if (!opts.length) return null;
    const keyOf = (o) => (o.i === 1 ? base : `${base}_${o.i}`);
    if (opts.length === 1) { this._pickedKey = keyOf(opts[0]); return opts[0].raw; }
    const seen = (this.scene.seen ||= {}), lk = `cv#last#${base}`, last = seen[lk];
    const pool = opts.filter((o) => o.i !== last);
    const pick = pool[Math.min(pool.length - 1, Math.floor(this.rng() * pool.length))];
    seen[lk] = pick.i; this.scene._dirty = true;
    this._pickedKey = keyOf(pick);
    return pick.raw;
  }
  speaker() {
    const v = getPath(this.scene.lines, this.cfg.speaker.name_key);
    return (Array.isArray(v) ? v[0] : v?.labels?.name || v?.pages?.[0] || (typeof v === 'string' ? v : null)) || FALLBACK.speaker;
  }

  // ---- observers (wired by attachCompanyVoice) --------------------------------------------------------------------
  onLog(e) {
    if (!e || !e.type) return;
    if (e.type === 'areaSign' && e.title) this.emit('area_new', { key: e.map, area: e.title });
    else if (e.type === 'evolve') this.emit('first_evolution', { creature: cap(e.from), new: cap(e.to) });
    else if (e.type === 'battle' && e.won !== false) this.emit('trainer_first_win', { trainer: cap(e.npc) });
    else if (e.type === 'flag' && e.on !== false) this.onFlag(e.flag);
    else if (e.type === 'warpStart') this.duckOff('scene'); // safety: a scene change never carries the duck along
  }
  onFlag(flag) {
    // quest_done.done_on_flag: {flag: quest id} - the main-quest prototype (?pg=quests) is off by default, so the promotion
    // task never raises q_mq_brookhollow_promotion_done in a normal game; got_starter (its reward flag) closes it for RITA.
    const alias = this.cfg.events.quest_done?.done_on_flag?.[flag];
    if (alias) { this.questDone(alias); return; }
    for (const name of ['master_beaten', 'rival_beaten', 'quest_done']) {
      const ev = this.cfg.events[name], m = ev?.flag_re && new RegExp(ev.flag_re).exec(flag || '');
      if (!m) continue;
      if (name === 'master_beaten') this.emit(name, { key: m[1], master: cap(m[1]) });
      else if (name === 'rival_beaten') this.emit(name, { key: m[1], trainer: 'Ron' });
      else this.questDone(m[1]);
      return;
    }
  }
  questDone(id) {
    const ev = this.cfg.events.quest_done; if (!ev) return;
    const q = this.scene.progression?.quests?.byId?.get?.(id);
    this.emit('quest_done', { key: id, quest: q?.title || cap(id), tier: (q ? q.type === 'main' : /^mq_/.test(id)) && ev.main_tier ? ev.main_tier : undefined });
  }
  onBattleResult(res) { if (res?.outcome === 'caught' && res.caught?.species) this.emit('first_catch', { creature: cap(res.caught.nickname || res.caught.species) }); }
  /** Per-tick diffs: Kilindex registered count, company ID level, Benefits Board ranks. First look = baseline only. */
  diff() {
    const sys = this.scene.systems, ki = sys?.kilindex;
    if (ki) {
      const n = ki.caughtCount;
      if (this._kiCount !== undefined && n > this._kiCount) {
        const en = this.cfg.events.kilindex_new;
        for (let c = this._kiCount + 1; c <= n; c++) {
          if (this.milestoneCounts().includes(c)) this.emit('kilindex_milestone', { key: c, count: c });
          else if (en && c >= en.min_count && c <= en.max_count) this.emit('kilindex_new', { key: c, count: c });
        }
      }
      this._kiCount = n;
    }
    const co = sys?.company;
    if (co) {
      const lv = Number(co.idLevel) || 1;
      if (this._idLevel !== undefined && lv > this._idLevel) this.emit('id_level_up', { key: lv, level: lv });
      this._idLevel = lv;
      const board = Object.fromEntries(Object.entries(co.board || {}).map(([k, v]) => [k, Number(v) || 0]));
      if (this._board) for (const [k, v] of Object.entries(board)) if (v > (this._board[k] || 0)) this.emit('board_node', { key: `${k}#${v}`, node: cap(k), rank: v });
      this._board = board;
    }
  }

  // ---- loop -------------------------------------------------------------------------------------------------------
  /** Input from the step: A (F on PC) advances / dismisses while a message is up. -> snap to pass on (A eaten). */
  input(snap) {
    const a = !!snap?.a, edge = a && !this._prevA; this._prevA = a;
    if (!a) this._eatA = false;
    // facing something usable (hall crystal, NPC, sign, pickup, prop): A goes to the world, the strip runs on its timer.
    // Eating it stranded players at Master 1: the trainer_first_win strip after helper_1 swallowed every crystal touch
    // (Gary 5:17 PM CT Oct 23, "can't get to the gym").
    if (this.current && edge && !this.facingUsable()) { this.advance('a'); this._eatA = true; }
    return this._eatA ? { ...snap, a: false } : snap; // held A after a dismiss never turns into a talk
  }
  /** True when an A press now would do something in the world (mirrors overworld.interact() targets). Never throws. */
  facingUsable() {
    try {
      const s = this.scene, p = s.player, m = s.map;
      if (!p || !m || s.busy || s.fade || p.moving) return false;
      const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.facing]; if (!d) return false;
      const fx = p.x + d[0], fy = p.y + d[1];
      if (s.systems?.puzzles?.get?.(m.name)?.switchAt?.(fx, fy, 'crystal')) return true;
      if ((m.items || []).some((it) => it.x === fx && it.y === fy && !s.flags?.has?.(it.flag || `item_${m.name}_${it.id}`))) return true; // bag.js pickupFlag
      if ((s.spots || []).some((sp) => sp.kind !== 'trigger' && sp.x === fx && sp.y === fy)) return true;
      for (let k = 1; k <= 3; k++) {
        const x = p.x + d[0] * k, y = p.y + d[1] * k;
        if (m.inBounds && !m.inBounds(x, y)) break;
        if ((m.signs || []).some((sg) => sg.x === x && sg.y === y) || m.npcAt?.(x, y)) return true;
      }
    } catch { /* never block the strip on a lookup error */ }
    return false;
  }
  tick() {
    const t = this.now(), blocked = this.blockedReason();
    if (this.current) {
      if (blocked) this.hide('interrupted:' + blocked);
      else if (t >= this.current.pageEnd) this.advance('timer');
    }
    // duck safety: never held without a message on screen, never past cfg.duck.maxMs (game clock)
    if (this._ducked && (!this.current || t - this._ducked.at >= (this.cfg.duck?.maxMs ?? 20000))) this.duckOff(this.current ? 'max' : 'orphan');
    if (this._preStart?.length && this.started()) { const p = this._preStart; this._preStart = null; for (const [n, c] of p) this.emit(n, c); }
    this.diff();
    if (this.burst.length && !blocked && t - this._burstAt >= this.cfg.timing.burst_window_ms) {
      const best = this.burst.slice().sort((x, y) => y.priority - x.priority || x.order - y.order)[0];
      this.burst = [];
      if (this.queue.length >= this.cfg.timing.queue_max) this.queue.sort((x, y) => y.priority - x.priority).pop();
      this.queue.push(best);
    }
    this.queue = this.queue.filter((q) => t - q.at <= this.cfg.timing.stale_ms);
    if (!this.current && this.queue.length && !blocked && this.mode !== 'off' && t - this.lastHideAt >= this.cfg.timing.global_cooldown_ms) {
      this.queue.sort((x, y) => y.priority - x.priority || x.at - y.at);
      this.show(this.queue.shift());
    }
  }
  pageMs(text) { return this.cfg.timing.page_ms + this.cfg.timing.per_char_ms * String(text).length; }
  /** The one-time Trainer 1 intro: {pages, voice}. Page 1 reads the real number. */
  trainer1Intro() {
    const L = this.scene.lines?.system_company_voice?.[TRAINER1_LINE];
    const raw = ((Array.isArray(L) ? L : L?.pages) || TRAINER1_INTRO).slice(0, 2);
    const vars = { ...(this.scene.textVars?.() || {}), employee_id: employeeIdOf(this.scene) };
    return { pages: raw.map((p) => String(p).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m))), voice: { key: TRAINER1_LINE, raw, vars } };
  }
  show(item) {
    const s = this.scene, seen = (s.seen ||= {});
    const intro = !seen[TRAINER1_KEY] && this.cfg.trainer1_intro !== false ? this.trainer1Intro() : null;
    let pages = this.pages(item.name, intro ? { ...item.ctx, employee_id: TRAINER1_NAME } : item.ctx), voice = this.lastPick || null;
    if (!pages.length && !intro) return; // a line-less event (rita_install) with the intro already seen: nothing to say
    if (!pages.length) voice = null;
    this.scene.checkpoint?.('company_voice'); // save rule: save right before, never while it is up
    // Trainer 1 intro in front; voice chains: intro pages, then the line's own pick (rita_voice.js planFor follows .then)
    if (intro) { pages = [...intro.pages, ...pages]; voice = { ...intro.voice, n: intro.pages.length, then: voice }; seen[TRAINER1_KEY] = true; s._dirty = true; }
    const t = this.now();
    this.current = { ...item, pages, page: 0, shownAt: t, pageEnd: t + this.pageMs(pages[0]), speaker: this.speaker(), voice };
    this.shownLog.push({ name: item.name, pages, at: t });
    this.scene.log?.push?.({ tick: this.scene.tick, type: 'companyVoice', event: item.name });
    this.view?.show(this.current);
    this.duckOn();
    this.hookPage();
  }
  /** RITA voice hook (src/systems/rita_voice.js sets this.onPage / this.onHide); never throws into the game loop. */
  hookPage() { try { this.onPage?.(this.current); } catch (e) { console.error('rita voice:', e); } }
  advance(why) {
    const c = this.current; if (!c) return;
    if (c.page + 1 < c.pages.length) { c.page++; c.pageEnd = this.now() + this.pageMs(c.pages[c.page]); this.view?.show(c); this.hookPage(); return; }
    this.hide(why);
  }
  hide(why = 'done') {
    if (!this.current) return;
    this.current = null; this.lastHideAt = this.now(); this.lastHideWhy = why;
    this.scene._dirty = true; // the step loop saves once nothing is locked
    this.view?.hide();
    try { this.onHide?.(why); } catch (e) { console.error('rita voice:', e); }
    this.duckOff(why);
  }
  state() { return { mode: this.mode, showing: this.current ? { event: this.current.name, page: this.current.page, text: this.current.pages[this.current.page], speaker: this.current.speaker } : null, queue: this.queue.map((q) => q.name), burst: this.burst.map((b) => b.name), shown: this.shownLog.map((s) => s.name), lastHideWhy: this.lastHideWhy || null, ducked: !!this._ducked }; }
}

// ---- DOM strip: small portrait + text, top-right under the clock / menu, never blocks movement ----------------------
const CSS = `.cv-strip{position:fixed;z-index:40;right:calc(var(--safe-right,0px) + var(--ui-hud-edge,16px));top:calc(var(--safe-top,0px) + var(--ui-hud-edge,16px) + var(--cv-top,64px));
display:flex;gap:10px;align-items:center;max-width:min(44vw,560px);padding:8px 12px 8px 8px;border:3px solid var(--outline,#2b2238);border-radius:12px;
background:var(--plate,#fff8e6);color:var(--ink,#2b2238);box-shadow:0 3px 0 var(--outline,#2b2238);font:600 var(--cv-font,clamp(13px,1.6vw,20px))/1.25 system-ui,sans-serif;
pointer-events:auto;transform:translateX(calc(100% + 40px));transition:transform .22s ease-out;cursor:pointer;touch-action:manipulation}
.cv-strip.show{transform:none}.cv-strip img{width:var(--cv-face,56px);height:var(--cv-face,56px);object-fit:cover;object-position:50% 20%;image-rendering:auto;border:2px solid var(--outline,#2b2238);border-radius:8px;background:#cfe3ff;flex:none}
.cv-strip .cv-name{font-size:.72em;letter-spacing:.08em;text-transform:uppercase;opacity:.75}.cv-strip .cv-more{font-size:.7em;opacity:.6;margin-left:4px}
@media (max-height:500px){.cv-strip{--cv-top:52px;--cv-face:40px;--cv-font:13px;max-width:52vw;padding:5px 9px 5px 5px}}
@media (prefers-reduced-motion:reduce){.cv-strip{transition:none}}`;

export class VoiceStrip {
  constructor(doc, cv) {
    this.doc = doc; this.cv = cv;
    if (!doc.getElementById('cv-style')) { const s = doc.createElement('style'); s.id = 'cv-style'; s.textContent = CSS; doc.head.appendChild(s); }
    const el = (this.el = doc.createElement('div'));
    el.className = 'cv-strip'; el.hidden = true; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); el.dataset.cv = '1';
    el.innerHTML = '<img alt=""><div><div class="cv-name"></div><div class="cv-text"></div></div>';
    el.querySelector('img').src = cv.cfg.speaker.portrait;
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); cv.advance('tap'); });
    doc.body.appendChild(el);
  }
  show(c) {
    this.el.hidden = false;
    this.el.querySelector('.cv-name').textContent = c.speaker;
    const more = c.page + 1 < c.pages.length ? ' <span class="cv-more">▼</span>' : '';
    this.el.querySelector('.cv-text').innerHTML = esc(c.pages[c.page]) + more;
    requestAnimationFrame?.(() => { if (this.cv.current === c) this.el.classList.add('show'); }); // a hide in the same frame must win (stuck-strip fix)
  }
  hide() { this.el.classList.remove('show'); if (!this.cv.current) this.el.querySelector('.cv-text').textContent = ''; setTimeout(() => { if (!this.cv.current) this.el.hidden = true; }, 260); }
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Flag: ?cv=0 off, ?cv=1 on, anything else (or absent) = cfg.default_on (true since the region 1 release). */
export function companyVoiceEnabled(query, cfg = { query_flag: 'cv', default_on: true }) {
  const v = query?.get?.(cfg.query_flag);
  if (v === '1') return true;
  if (v === '0') return false;
  return !!cfg.default_on;
}

/**
 * Wire it to the scene (call after attachSystems / attachOvernight / attachEvolution). Returns the CompanyVoice or null (off).
 * opts: {query, cfg (data object; else fetched), storage, now, doc, ui, audio (() => audio api; default scene.audio)}
 */
export async function attachCompanyVoice(scene, opts = {}) {
  if (!scene || scene.companyVoice) return scene?.companyVoice || null;
  let cfg = opts.cfg;
  if (!cfg && !companyVoiceEnabled(opts.query)) return null; // ?cv=0: nothing fetched, nothing wrapped
  if (!cfg) cfg = await fetch('data/company_voice.json').then((r) => r.json());
  if (!companyVoiceEnabled(opts.query, cfg)) return null;
  let storage = opts.storage; if (storage === undefined) { try { storage = globalThis.localStorage || null; } catch { storage = null; } }
  const cv = new CompanyVoice(scene, cfg, { storage, now: opts.now, ui: opts.ui || (() => globalThis.kilumen?.ui), audio: opts.audio });
  scene.companyVoice = cv;

  // log observer (flags, area signs, evolutions, trainer battles): wraps push on the scene's one log array
  const log = scene.log;
  if (Array.isArray(log)) { const push = log.push.bind(log); log.push = (...es) => { for (const e of es) { try { cv.onLog(e); } catch (err) { console.error('company voice:', err); } } return push(...es); }; }
  // first catch
  const sys = scene.systems;
  if (sys?.applyBattleResult) { const apply = sys.applyBattleResult.bind(sys); sys.applyBattleResult = (res) => { const out = apply(res); try { cv.onBattleResult(res); } catch (e) { console.error('company voice:', e); } return out; }; }
  // save rule: nothing is written while a message is up
  (scene.saveGuards ||= []).push(() => (cv.current && !cv._self ? 'company_voice' : null));
  // input + loop
  if (typeof scene.step === 'function') {
    const step = scene.step.bind(scene);
    scene.step = (snap) => { step(cv.input(snap)); try { cv.tick(); } catch (e) { console.error('company voice:', e); } };
  }
  const doc = opts.doc === undefined ? globalThis.document : opts.doc;
  if (doc?.body) cv.view = new VoiceStrip(doc, cv);
  return cv;
}
