// Kilumen: 3 save slots (Gary, Oct 31 2026). Pure helpers over a sync Storage (localStorage / save_backend cache / Map stub).
//   - Slot 1 lives under the old key (SAVE_KEY), so an existing save IS slot 1 the first time this runs: nothing is moved,
//     its .bak stays, and a one-time copy is kept under SAVE_KEY + '.preslots.bak'.
//   - Slots 2 and 3: SAVE_KEY + '.slot2' / '.slot3' (+ .bak each).
//   - Exactly one slot is the cloud slot (default 1). Only that slot is compared with / uploaded to the account's one cloud
//     row (src/net/cloud_save.js, public.kilumen_saves). No DB change: the cloud row still holds one save.
//   - "Make this my cloud save" moves the cloud mark to another used slot; the old cloud slot stays on the device as a
//     device save. The next boot then keeps the new slot over the cloud copy (preferLocal, no conflict pick).
//   - The slot list (which slot is active = last used, which is cloud) is kept in localStorage under META_KEY.
import { SAVE_KEY } from './save.js?v=v0.2.111-alpha';

export const SLOTS = [1, 2, 3];
export const META_KEY = 'kilumen.slots.v1';
export const PRESLOTS_BAK = SAVE_KEY + '.preslots.bak';

export const slotKey = (n) => (n === 1 ? SAVE_KEY : `${SAVE_KEY}.slot${n}`);
/** Every key a slot uses (main + .bak), for the IndexedDB preload. */
export const allSlotKeys = () => SLOTS.flatMap((n) => [slotKey(n), slotKey(n) + '.bak']);
const okSlot = (n) => SLOTS.includes(n);

export function readMeta(ls) {
  let m = null;
  try { m = JSON.parse(ls?.getItem(META_KEY) || 'null'); } catch { m = null; }
  return {
    v: 1,
    active: okSlot(m?.active) ? m.active : 1,
    cloud: okSlot(m?.cloud) ? m.cloud : 1,
    swapPending: okSlot(m?.swapPending) ? m.swapPending : null,
  };
}
export function writeMeta(ls, m) {
  const out = { v: 1, active: okSlot(m.active) ? m.active : 1, cloud: okSlot(m.cloud) ? m.cloud : 1, swapPending: okSlot(m.swapPending) ? m.swapPending : null };
  try { ls?.setItem(META_KEY, JSON.stringify(out)); } catch { /* full / blocked */ }
  return out;
}

/** First run with slots: the old save becomes slot 1 (same key) and a one-time copy is kept. Idempotent. */
export function migrateToSlots(storage, ls = storage) {
  let had = false;
  try { had = !!ls?.getItem(META_KEY); } catch { /* blocked */ }
  if (had) return { migrated: false, meta: readMeta(ls) };
  const raw = storage?.getItem(SAVE_KEY);
  if (raw && !storage.getItem(PRESLOTS_BAK)) { try { storage.setItem(PRESLOTS_BAK, raw); } catch { /* full */ } }
  return { migrated: !!raw, meta: writeMeta(ls, { active: 1, cloud: 1 }) };
}

const parse = (raw) => { try { const o = JSON.parse(raw); return o && typeof o === 'object' ? o : null; } catch { return null; } };
const nice = (s) => String(s || '').replace(/_int$|_\d+f$/i, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Play time in ms: systems.playMs when a system tracks it, else null (the card then leaves it out). */
export function playTimeOf(o) {
  const ms = Number(o?.systems?.playMs ?? o?.playMs);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}
export function fmtPlayTime(ms) {
  if (ms == null) return '';
  const m = Math.floor(ms / 60000), h = Math.floor(m / 60);
  return `${h}:${String(m % 60).padStart(2, '0')}`;
}

/** Card data for one slot (null fields = not known). Reads the main key, else the .bak. */
export function slotInfo(storage, n, meta, isLoadable = () => true) {
  let o = null;
  for (const k of [slotKey(n), slotKey(n) + '.bak']) {
    const raw = storage?.getItem(k);
    if (raw && isLoadable(raw)) { o = parse(raw); if (o) break; }
  }
  const lead = Array.isArray(o?.party) ? o.party[0] : null;
  return {
    n, used: !!o, cloud: meta.cloud === n, active: meta.active === n,
    name: o ? (o.seen?.['open2:name'] || o.playerName || null) : null, // name picked in the opening (opening_v2.js OPEN2.nameKey)
    playMs: o ? playTimeOf(o) : null,
    badges: o ? Object.keys(o.systems?.progression?.masters || {}).length : 0,
    place: o?.pos?.map ? nice(o.pos.map) : null,
    lead: lead ? (lead.nickname || lead.species || null) : null,
    savedAt: Number(o?.savedAt) || 0,
    saveId: o?.saveId || null,
  };
}
export const listSlots = (storage, meta, isLoadable) => SLOTS.map((n) => slotInfo(storage, n, meta, isLoadable));

/** What the title can offer. Continue = the last-used (active) slot has a save. */
export function titleChoices(slots, meta) {
  const act = slots.find((s) => s.n === meta.active);
  return { continue: !!act?.used, load: slots.some((s) => s.used) };
}

/** Boot plan for main.js: which key the game plays, which key the cloud compares, and whether uploads are allowed. */
export function bootPlan(meta) {
  return {
    activeKey: slotKey(meta.active), cloudKey: slotKey(meta.cloud),
    activeIsCloud: meta.active === meta.cloud, preferLocal: meta.swapPending === meta.cloud,
  };
}

/** New game in slot n: n becomes active (the reload with ?reset=1 clears it). */
export const planNewGame = (ls, n) => writeMeta(ls, { ...readMeta(ls), active: n });
/** Load slot n (must be used): n becomes active. */
export const planLoad = (ls, n) => writeMeta(ls, { ...readMeta(ls), active: n });
/** Make slot n the one cloud slot. The previous cloud slot becomes a device save (its data stays). */
export function planCloudSwap(ls, n, used = true) {
  const m = readMeta(ls);
  if (!okSlot(n) || !used || m.cloud === n) return m;
  return writeMeta(ls, { ...m, cloud: n, swapPending: n });
}
/** The boot kept the new cloud slot over the cloud copy: drop the pending mark. */
export function clearSwapPending(ls) { const m = readMeta(ls); return m.swapPending ? writeMeta(ls, { ...m, swapPending: null }) : m; }

/** Upload gate: a save may go to the cloud only when it was written to the cloud slot's key. */
export const mayUpload = (meta, key) => key === slotKey(meta.cloud);
