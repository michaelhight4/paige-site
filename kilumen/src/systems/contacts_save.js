// Kilumen: Contacts save block (Coder, Oct 23 2026). No imports: save.js uses it without pulling in the contacts
// runtime (src/systems/contacts.js, dev only behind ?contacts=1). The save file version (SAVE_VERSION) is NOT bumped:
// the block is optional and only exists in saves made with ?contacts=1, so flag-off saves are byte-for-byte as before.
// The block carries its own version `v` (CONTACTS_V) and migrations instead.
export const CONTACTS_V = 1;
/** Block migrations: CONTACTS_MIGRATIONS[n](block) -> block at v n+1. Blocks without `v` are pre-release v0 (same shape). */
export const CONTACTS_MIGRATIONS = {
  0: (b) => ({ ...b, v: 1 }),
};
/** The empty block (first time the flag is on for a save). */
export function contactsDefault() {
  return { v: CONTACTS_V, list: [], declined: {}, ready: {}, wins: {}, log: [], ping: { steps: 0, lastAt: -1, day: -1, today: 0, n: 0 } };
}
const num = (v, d) => (Number.isFinite(v) ? v : d);

/** Shape any stored value into a valid block (old / hand-edited saves). Returns a fresh object. */
export function normaliseContacts(v) {
  const d = contactsDefault();
  if (!v || typeof v !== 'object' || Array.isArray(v)) return d;
  let n = Number.isInteger(v.v) ? v.v : 0;
  if (n > CONTACTS_V) return d; // a newer build's block: start clean rather than misread it (the rest of the save loads)
  while (n < CONTACTS_V) { v = CONTACTS_MIGRATIONS[n](v); n++; }
  const obj = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? o : {});
  const seen = new Set();
  d.list = (Array.isArray(v.list) ? v.list : []).map((c) => (typeof c === 'string' ? { key: c } : c))
    .filter((c) => c && typeof c.key === 'string' && c.key && !seen.has(c.key) && seen.add(c.key))
    .map((c) => ({ key: c.key, name: typeof c.name === 'string' ? c.name : null, cls: typeof c.cls === 'string' ? c.cls : null,
      place: typeof c.place === 'string' ? c.place : null, at: num(c.at, 0) }));
  for (const k of ['declined', 'ready', 'wins']) for (const [a, b] of Object.entries(obj(v[k]))) if (Number.isFinite(b)) d[k][a] = b;
  d.log = (Array.isArray(v.log) ? v.log : []).filter((m) => m && typeof m.key === 'string').slice(-50)
    .map((m) => ({ key: m.key, kind: String(m.kind || 'chat'), text: Array.isArray(m.text) ? m.text.map(String) : [], at: num(m.at, 0) }));
  const p = obj(v.ping);
  d.ping = { steps: num(p.steps, 0), lastAt: num(p.lastAt, -1), day: num(p.day, -1), today: num(p.today, 0), n: num(p.n, 0) };
  return d;
}

