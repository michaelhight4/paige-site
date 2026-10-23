// Kilumen: save-file schema (Valibot 1.5.0, MIT, src/vendor/valibot). Free tools pass, Oct 23, 2026.
// Two layers, checked on the RAW parsed save before migrate/normalise (save.js):
//   1. ENVELOPE (hard): not an object, a bad version, flags that are not a short string list, or absurd sizes.
//      A failing save is rejected, so SaveStore.load falls back to the backup (then to a new game).
//   2. FIELDS (soft): known blocks with the wrong type. normalise() already repairs these to defaults, so they are
//      only reported (SaveStore.lastWarnings) and never block a load. Being stricter here would turn a repairable
//      save into a lost one.
import * as v from '../vendor/valibot/valibot.min.js?v=v0.2.2-alpha';

const MAX_FLAGS = 5000, MAX_STR = 200, MAX_JSON = 2_000_000; // edited/corrupt saves, not real play
const num = v.pipe(v.number(), v.finite());
const int = v.pipe(v.number(), v.integer());
const str = v.pipe(v.string(), v.maxLength(MAX_STR));

export const SaveEnvelope = v.looseObject({
  v: v.pipe(int, v.minValue(1)),
  flags: v.pipe(v.array(str), v.maxLength(MAX_FLAGS)),
});

export const SaveFields = v.looseObject({
  saveId: v.optional(str),
  counters: v.optional(v.record(v.string(), num)),
  seen: v.optional(v.record(v.string(), v.unknown())),
  seenDay: v.optional(v.record(v.string(), v.unknown())),
  clock: v.optional(v.object({ day: num, min: num })),
  party: v.optional(v.array(v.looseObject({ species: str, warmth: v.optional(v.nullable(num)), level: v.nullish(int), xp: v.optional(num) }))),
  pos: v.nullish(v.looseObject({ map: str, x: int, y: int })),
  lastDoor: v.nullish(v.looseObject({ map: str })),
  savedAt: v.optional(num),
  coins: v.optional(num),
  bag: v.optional(v.record(v.string(), num)),
});

const fmt = (issues) => issues.map((i) => `${v.getDotPath(i) || '(root)'}: ${i.message}`);

/**
 * @param {unknown} raw  parsed save JSON (or the raw string, for the size check)
 * @returns {{ok: boolean, issues: string[], warnings: string[]}}  ok=false means do not load this save
 */
export function checkSave(raw) {
  if (typeof raw === 'string') {
    if (raw.length > MAX_JSON) return { ok: false, issues: [`save is ${raw.length} chars (max ${MAX_JSON})`], warnings: [] };
    try { raw = JSON.parse(raw); } catch (e) { return { ok: false, issues: [`JSON: ${e.message}`], warnings: [] }; }
  }
  const env = v.safeParse(SaveEnvelope, raw);
  if (!env.success) return { ok: false, issues: fmt(env.issues), warnings: [] };
  const fields = v.safeParse(SaveFields, raw);
  return { ok: true, issues: [], warnings: fields.success ? [] : fmt(fields.issues) };
}

/** True if a stored save string is safe to keep as the backup copy. */
export function isLoadableSave(rawString) {
  try { return !!rawString && checkSave(rawString).ok; } catch { return false; }
}
