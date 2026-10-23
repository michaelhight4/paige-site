// Kilumen: per-save state (flags, counters, seen lines, clock, party, position) with localStorage save/load.
// Pure apart from the injected `storage` (window.localStorage in the browser, a Map-backed stub in tests).
// One save + one backup (checklist: "only one auto-save plus one backup per slot"): every write first copies the
// current main save to the backup key, so an interrupted write never loses both (checklist: "Interrupted play
// never corrupts a save"). A main save that fails to parse/validate falls back to the backup.

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'kilumen.save.v1';

/** Counters named in overworld_lines.json _meta.counters. */
export const COUNTERS = ['office_display_taps', 'bin_inspects_after_8'];

export function freshSave() {
  return {
    v: SAVE_VERSION,
    flags: [],
    counters: Object.fromEntries(COUNTERS.map((c) => [c, 0])),
    seen: {},          // "<spot>#<line id>" -> true   (once, dream_unseen, inbox read "inbox#<id>")
    seenDay: {},       // "<spot>#<line id>" -> in-game day it last showed (once_per_day, once per dusk)
    clock: { day: 0, min: 8 * 60 }, // in-game day + minute of day (08:00 = day start)
    party: [],         // [{species, nickname, warmth 0-100, rt}] lead first
    pos: null,         // {map, x, y, facing}
    lastDoor: null,
    savedAt: 0,
  };
}

/** Validate + normalise a parsed save; throws on anything structurally wrong. */
export function normalise(o) {
  if (!o || typeof o !== 'object' || o.v !== SAVE_VERSION) throw new Error('bad save version');
  const s = freshSave();
  if (!Array.isArray(o.flags) || o.flags.some((f) => typeof f !== 'string')) throw new Error('bad flags');
  s.flags = [...new Set(o.flags)];
  for (const [k, v] of Object.entries(o.counters || {})) if (Number.isFinite(v)) s.counters[k] = Math.max(0, Math.floor(v));
  if (o.seen && typeof o.seen === 'object') s.seen = { ...o.seen };
  if (o.seenDay && typeof o.seenDay === 'object') s.seenDay = { ...o.seenDay };
  if (o.clock && Number.isFinite(o.clock.day) && Number.isFinite(o.clock.min)) s.clock = { day: o.clock.day, min: ((o.clock.min % 1440) + 1440) % 1440 };
  if (Array.isArray(o.party)) s.party = o.party.filter((c) => c && typeof c.species === 'string')
    .map((c) => ({ species: c.species, nickname: c.nickname || null, warmth: clampWarmth(c.warmth), rt: c.rt || null }));
  if (o.pos && typeof o.pos.map === 'string' && Number.isInteger(o.pos.x) && Number.isInteger(o.pos.y)) s.pos = { map: o.pos.map, x: o.pos.x, y: o.pos.y, facing: o.pos.facing || 'down' };
  if (o.lastDoor && typeof o.lastDoor.map === 'string') s.lastDoor = { map: o.lastDoor.map, x: o.lastDoor.x, y: o.lastDoor.y };
  s.savedAt = Number(o.savedAt) || 0;
  return s;
}

export function clampWarmth(w) { return Math.max(0, Math.min(100, Math.round(Number(w) || 0))); }

export class SaveStore {
  /** @param {Storage|null} storage  null = persistence off (?save=0) */
  constructor(storage, key = SAVE_KEY) { this.storage = storage; this.key = key; this.bakKey = key + '.bak'; this.lastError = null; }

  _read(k) {
    const raw = this.storage?.getItem(k);
    return raw ? normalise(JSON.parse(raw)) : null;
  }

  /** Main save, else the backup, else null. */
  load() {
    if (!this.storage) return null;
    for (const k of [this.key, this.bakKey]) {
      try { const s = this._read(k); if (s) { this.loadedFrom = k; return s; } } catch (e) { this.lastError = `${k}: ${e.message}`; }
    }
    return null;
  }

  save(state) {
    if (!this.storage) return false;
    try {
      const json = JSON.stringify({ ...state, v: SAVE_VERSION, savedAt: Date.now() });
      normalise(JSON.parse(json)); // never write something we could not read back
      const prev = this.storage.getItem(this.key);
      if (prev) this.storage.setItem(this.bakKey, prev);
      this.storage.setItem(this.key, json);
      return true;
    } catch (e) { this.lastError = e.message; return false; }
  }

  clear() { this.storage?.removeItem(this.key); this.storage?.removeItem(this.bakKey); }
}
