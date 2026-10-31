// Kilumen: per-save state (flags, counters, seen lines, clock, party, position) with save/load over a sync Storage.
// Pure apart from the injected `storage`: window.localStorage, the IndexedDB-backed cache from save_backend.js
// (idb-keyval, libs pass Oct 22, 2026) or a Map-backed stub in tests.
// One save + one backup (checklist: "only one auto-save plus one backup per slot"): every write first copies the
// current main save to the backup key, so an interrupted write never loses both (checklist: "Interrupted play
// never corrupts a save"). A main save that fails to parse/validate falls back to the backup.
//
// Versions (docs/systems_open_source_eval.md §8): v1 = the soul-pass save. v2 adds saveId, coins, bag, archive,
// kilindex, tasks, company and the party fields uid/level/xp/held/locked/variant. Only the FORMAT exists so far:
// no system reads or writes those blocks yet. Older saves go through MIGRATIONS one step at a time (v1 -> v2 ...),
// so an old save always loads. The storage key keeps its v1 name so existing saves are found.

import { checkSave, isLoadableSave } from './save_schema.js?v=v0.2.XXX-alpha'; // Valibot save check (free tools pass, Oct 23, 2026)
import { normaliseContacts } from '../systems/contacts_save.js?v=v0.2.XXX-alpha'; // [contacts] optional block, dev only (?contacts=1); no version bump
import { rollRon, ensureRonRoll } from '../battle/data/ron_team.js?v=v0.2.XXX-alpha'; // Ron's per-save roll (Gary 5:09 PM)
import { employeeIdFor, EMPLOYEE_ID_RE } from '../systems/employee_id.js?v=v0.2.XXX-alpha'; // company voice: per-save employee number (Gary 12:20 PM CT)

export const SAVE_VERSION = 2;
// Padded maps (Gary, Oct 23 2026, 10:25 AM CT): positions are stored in the padded-map frame from now on. A save without
// frame:'padded' written before the padding landed (09:15 AM CT) holds unpadded coordinates; overworld.js shifts those by
// the map's padding and snaps to the nearest walkable tile (pad_migrate.js).
export const POS_FRAME = 'padded';
export const PAD_SINCE = Date.parse('2026-10-23T09:15:00-05:00');
export const SAVE_KEY = 'kilumen_alpha_save.v1'; // key name kept from v1 on purpose (existing saves); the version is inside

/** Counters named in overworld_lines.json _meta.counters. */
export const COUNTERS = ['office_display_taps', 'bin_inspects_after_8'];

/** v2 blocks the overworld does not touch yet. SaveStore carries them from the last load into every save. */
export const V2_BLOCKS = ['saveId', 'coins', 'bag', 'archive', 'kilindex', 'tasks', 'company', 'systems']; // [systems-gd hook] + systems

function v2Defaults() {
  return {
    coins: 0,
    bag: {},                 // itemId -> qty
    archive: { boxes: [] },  // Field Archive boxes (proposal: 8 x 30)
    kilindex: { seen: {}, caught: {}, transferred: {}, minW: {}, maxW: {}, regions: {}, variants: {}, skills: {} },
    tasks: { boardWeek: 0, milestones: { total: 0, region: {}, species: {} }, research: {}, side: [], story: {}, done: 0 },
    company: {
      idLevel: 1, pointsFree: 0, board: {}, respecWeek: 0, // idLevel start value is a proposal (Gary's call)
      employeeId: '', // 6-digit employee number, e.g. '001893' (src/systems/employee_id.js; set by freshSave / normalise)
      transfers: { total: 0, bySpecies: {}, goalTier: 0, weekly: null }, perkClaims: {},
      xp: 0, xpClaims: {}, // RT Employee Benefits (src/systems/rt_benefits.js): company XP + once-claims; old saves load as 0
    },
    systems: {}, // [systems-gd hook] src/systems state (lastHeal, puzzles, bag recency...), open map
  };
}

/** Small string hash (FNV-1a, base 36). Deterministic ids for migrated saves. */
/**
 * Title screen "Continue" (dev fix, batch 3 wire, Oct 23 2026). Real cause of the first-launch bug: the overworld
 * autosaves on its first frames (_dirty after _enterMap -> saveNow in the loop) before the UI module loads and opens the
 * title, and scr_title asked the store live (store.load()), so the brand-new autosave looked like an old game.
 * The answer is whether a save existed at BOOT (main.js loads it before the scene exists); once the player has left the
 * title this session (played), a stored save counts too (title reopened from Screen previews).
 */
export function showContinue({ bootSave = null, played = false, stored = null } = {}) {
  return !!bootSave || (!!played && !!stored);
}

export function hashStr(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

export function newSaveId() {
  const b = new Uint32Array(2);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(b);
  else { b[0] = Math.random() * 2 ** 32; b[1] = Math.random() * 2 ** 32; }
  return 'k' + b[0].toString(36) + b[1].toString(36);
}

export function freshSave() {
  const s = {
    v: SAVE_VERSION,
    saveId: newSaveId(),     // random per new game; seeds generated quests later
    flags: [],
    counters: Object.fromEntries(COUNTERS.map((c) => [c, 0])),
    seen: {},          // "<spot>#<line id>" -> true   (once, dream_unseen, inbox read "inbox#<id>")
    seenDay: {},       // "<spot>#<line id>" -> in-game day it last showed (once_per_day, once per dusk)
    clock: { day: 0, min: 8 * 60 }, // in-game day + minute of day (08:00 = day start)
    party: [],         // [{uid, species, nickname, warmth 0-100, rt, level, xp, held, locked, variant}] lead first
    pos: null,         // {map, x, y, facing}
    lastDoor: null,
    savedAt: 0,
    frame: POS_FRAME, // position frame (padded maps); see POS_FRAME
    ...v2Defaults(),
  };
  s.company.employeeId = employeeIdFor(s.saveId); // company voice: stable per-save employee number
  s.ron_roll = rollRon(s.saveId); // Ron's seed (from the save ID): each Ron fight re-rolls its 3 slots from it + the fight number (ron_team.js)
  return s;
}

// ---- migrations: MIGRATIONS[n] turns a raw v(n) object into a raw v(n+1) object -----------------------------
export const MIGRATIONS = {
  1(o) {
    const saveId = 'k' + hashStr(JSON.stringify(o)); // deterministic: main and .bak of one v1 save get the same id
    const party = Array.isArray(o.party) ? o.party : [];
    const d = v2Defaults();
    for (const c of party) {
      if (!c || typeof c.species !== 'string') continue;
      d.kilindex.seen[c.species] = 1;
      d.kilindex.caught[c.species] = (d.kilindex.caught[c.species] || 0) + 1;
    }
    return {
      ...o, ...d, v: 2, saveId,
      party: party.map((c, i) => (c && typeof c === 'object' ? { ...c, uid: `${saveId}-p${i}` } : c)),
    };
  },
};

/** Bring a parsed save up to SAVE_VERSION, one step at a time. Throws on unknown or future versions. */
export function migrate(o) {
  if (!o || typeof o !== 'object' || !Number.isInteger(o.v) || o.v < 1 || o.v > SAVE_VERSION) throw new Error('bad save version');
  let cur = o;
  while (cur.v < SAVE_VERSION) {
    const step = MIGRATIONS[cur.v];
    if (!step) throw new Error(`no migration from v${cur.v}`);
    cur = step(cur);
  }
  return cur;
}

const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const clone = (x) => JSON.parse(JSON.stringify(x));
/** Shape `val` like the default `def`: wrong types fall back to the default; {} defaults are open maps. */
function shaped(def, val) {
  if (isObj(def)) {
    if (!isObj(val)) return clone(def);
    if (!Object.keys(def).length) return clone(val);
    return Object.fromEntries(Object.keys(def).map((k) => [k, shaped(def[k], val[k])]));
  }
  if (Array.isArray(def)) return Array.isArray(val) ? clone(val) : [];
  if (def === null) return val === null || isObj(val) ? (val && clone(val)) : null;
  if (typeof def === 'number') return Number.isFinite(val) ? val : def;
  return typeof val === typeof def ? val : def;
}
const natInt = (n) => Math.max(0, Math.floor(Number(n) || 0));

const keepSystemsFields = (c) => Object.fromEntries(['hp', 'energy', 'status', 'skills', 'lineage', 'origin'].filter((k) => c[k] != null).map((k) => [k, clone(c[k])])); // [systems-gd hook]
function normParty(list, saveId) {
  const used = new Set();
  return list.filter((c) => c && typeof c.species === 'string').map((c, i) => {
    let uid = typeof c.uid === 'string' && c.uid ? c.uid : `${saveId}-n${i}`;
    while (used.has(uid)) uid += 'x';
    used.add(uid);
    return {
      uid, species: c.species, nickname: c.nickname || null, warmth: clampWarmth(c.warmth), rt: c.rt || null,
      level: Number.isInteger(c.level) && c.level > 0 ? c.level : null, xp: natInt(c.xp),
      held: typeof c.held === 'string' ? c.held : null, locked: c.locked === true, variant: typeof c.variant === 'string' ? c.variant : null,
      ...keepSystemsFields(c), // [systems-gd hook] hp/energy/status/skills/lineage/origin (src/systems/creature.js validates)
    };
  });
}

/** Migrate + validate + normalise a parsed save; throws on anything structurally wrong. */
export function normalise(input) {
  const o = migrate(input);
  const s = freshSave();
  if (!Array.isArray(o.flags) || o.flags.some((f) => typeof f !== 'string')) throw new Error('bad flags');
  s.saveId = typeof o.saveId === 'string' && o.saveId ? o.saveId : 'k' + hashStr(JSON.stringify(o.flags) + (o.savedAt || 0));
  s.flags = [...new Set(o.flags)];
  for (const [k, v] of Object.entries(isObj(o.counters) ? o.counters : {})) if (Number.isFinite(v)) s.counters[k] = Math.max(0, Math.floor(v));
  if (isObj(o.seen)) s.seen = { ...o.seen };
  if (isObj(o.seenDay)) s.seenDay = { ...o.seenDay };
  if (o.clock && Number.isFinite(o.clock.day) && Number.isFinite(o.clock.min)) s.clock = { day: o.clock.day, min: ((o.clock.min % 1440) + 1440) % 1440 };
  if (Array.isArray(o.party)) s.party = normParty(o.party, s.saveId);
  if (o.pos && typeof o.pos.map === 'string' && Number.isInteger(o.pos.x) && Number.isInteger(o.pos.y)) s.pos = { map: o.pos.map, x: o.pos.x, y: o.pos.y, facing: o.pos.facing || 'down' };
  if (o.lastDoor && typeof o.lastDoor.map === 'string') s.lastDoor = { map: o.lastDoor.map, x: o.lastDoor.x, y: o.lastDoor.y };
  if (o.game_cleared && typeof o.game_cleared === 'object' && Number.isFinite(o.game_cleared.at)) s.game_cleared = o.game_cleared; // interim ending (ending.js normClear shapes it)
  if (o.devTouched === true) s.devTouched = true; // v0.2.26: dev console / master key marker, kept on every later save
  s.savedAt = Number(o.savedAt) || 0;
  s.frame = o.frame === POS_FRAME || (!('frame' in o) && s.savedAt >= PAD_SINCE) ? POS_FRAME : 'unpadded';
  // v2 blocks
  const d = v2Defaults();
  s.coins = natInt(o.coins);
  s.bag = Object.fromEntries(Object.entries(isObj(o.bag) ? o.bag : {}).map(([k, n]) => [k, natInt(n)]).filter(([, n]) => n > 0));
  for (const k of ['archive', 'kilindex', 'tasks', 'company', 'systems']) s[k] = shaped(d[k], o[k]); // [systems-gd hook] + systems
  if ('contacts' in o) s.contacts = normaliseContacts(o.contacts); // [contacts] only when present: flag-off saves are unchanged
  if (!EMPLOYEE_ID_RE.test(s.company.employeeId)) s.company.employeeId = employeeIdFor(s.saveId); // old saves get their number on load
  s.ron_roll = ensureRonRoll({ ron_roll: o.ron_roll, saveId: s.saveId }); // old saves without one get the seed from their save ID
  return s;
}

export function clampWarmth(w) { return Math.max(0, Math.min(100, Math.round(Number(w) || 0))); }

/** Party members added in play (no uid yet) get one now, written back onto the live objects so it sticks. */
function ensureUids(party, saveId) {
  if (!Array.isArray(party)) return;
  const used = new Set(party.map((c) => c?.uid).filter(Boolean));
  for (const c of party) {
    if (!c || c.uid) continue;
    let uid; do uid = `${saveId}-${newSaveId().slice(1, 9)}`; while (used.has(uid));
    used.add(uid); c.uid = uid;
  }
}

export class SaveStore {
  /** @param {Storage|null} storage  null = persistence off (?save=0); any sync getItem/setItem/removeItem works */
  constructor(storage, key = SAVE_KEY) {
    this.storage = storage; this.key = key; this.bakKey = key + '.bak'; this.lastError = null;
    this.extra = pickBlocks(freshSave()); // v2 blocks for the next save (from the last load, else a new game's)
  }

  _read(k) {
    const raw = this.storage?.getItem(k);
    if (!raw) return null;
    const chk = checkSave(raw); // [free-tools pass] Valibot gate: a bad save is rejected here, so load() falls back
    if (!chk.ok) throw new Error('save check: ' + chk.issues.slice(0, 3).join('; '));
    if (chk.warnings.length) this.lastWarnings = [...(this.lastWarnings || []), ...chk.warnings.map((w) => `${k}: ${w}`)];
    return normalise(JSON.parse(raw));
  }

  /** Main save, else the backup, else null. Remembers the v2 blocks so the next save keeps them. */
  load() {
    if (!this.storage) return null;
    this.lastWarnings = [];
    for (const k of [this.key, this.bakKey]) {
      try { const s = this._read(k); if (s) { this.loadedFrom = k; this.extra = pickBlocks(s); return s; } } catch (e) {
        this.lastError = `${k}: ${e.message}`;
        // [free-tools pass] keep the unreadable main save under <key>.bad (never deleted) before a later save replaces it
        if (k === this.key) { try { const raw = this.storage.getItem(k); if (raw) this.storage.setItem(this.key + '.bad', raw); } catch { /* storage full or blocked */ } }
      }
    }
    return null;
  }

  save(state) {
    if (!this.storage || this.hold) return false; // ALPHA: hold = first launch, title choice not made yet
    try {
      const full = { ...this.extra, ...state };
      ensureUids(full.party, full.saveId);
      const json = JSON.stringify({ ...full, v: SAVE_VERSION, savedAt: Date.now() });
      normalise(JSON.parse(json)); // never write something we could not read back
      const prev = this.storage.getItem(this.key);
      if (prev && isLoadableSave(prev)) this.storage.setItem(this.bakKey, prev); // [free-tools pass] never replace a good backup with a bad save
      this.storage.setItem(this.key, json);
      try { this.onSaved?.(json); } catch (e) { console.warn('cloud save:', e?.message || e); } // cloud saves: only after the local save succeeded
      return true;
    } catch (e) { this.lastError = e.message; return false; }
  }

  clear() { this.storage?.removeItem(this.key); this.storage?.removeItem(this.bakKey); this.extra = pickBlocks(freshSave()); }
}

const KEEP_BLOCKS = [...V2_BLOCKS, 'contacts', 'devTouched', 'ron_roll']; // [contacts] optional block: carried through saves only if a save already has it
function pickBlocks(s) { return Object.fromEntries(KEEP_BLOCKS.filter((k) => k in s).map((k) => [k, s[k]])); }
