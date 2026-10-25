// Kilumen bag: pockets, add / remove / use, engine export, and map pickups. systems-gd pass, Oct 22, 2026.
// Save shape (save.js v2 `bag` block): flat { itemId: count } (pockets come from the item table, so moving an
// item between pockets never needs a migration). The battle engine takes the same { itemId: count } shape.
import { ITEMS, POCKETS } from './items.js?v=v0.2.24-alpha';
import { maxHp, energyOf, maxEnergy, isFainted } from './creature.js?v=v0.2.24-alpha';
import { fmtMoney } from './config.js?v=v0.2.24-alpha';

export { POCKETS };
const natInt = (n) => Math.max(0, Math.floor(Number(n) || 0));

export class Bag {
  /** data: save.bag ({id: count}); items: item table (src/systems/items.js); cfg: SYSTEMS_CONFIG; lines: overworld_lines */
  constructor(data = {}, { items = ITEMS, cfg = {}, lines = null, recent = [] } = {}) {
    this.items = items; this.cfg = cfg; this.lines = lines;
    this.counts = {};
    for (const [k, n] of Object.entries(data || {})) if (natInt(n) > 0) this.counts[k] = natInt(n);
    this.recent = recent.filter((id) => this.counts[id]); // most recently added first (SP 7.4 sort)
  }
  def(id) { return this.items[id] || null; }
  /** Pocket id: item table, else Text Bot's catalogue pocket, else 'gear'. */
  pocketOf(id) {
    return this.def(id)?.pocket || this.lines?.system_item_catalogue?.[id]?.pocket || 'gear';
  }
  /** Player-facing name: Text Bot catalogue, else engine name, else a TODO label. */
  nameOf(id) {
    return this.lines?.system_item_catalogue?.[id]?.name || this.def(id)?.name || id;
  }
  pocketLabel(p) { return this.lines?.comfort?.bag_pockets?.[p]?.label || p; }
  isKey(id) { return !!this.def(id)?.key || this.pocketOf(id) === 'key'; }
  count(id) { return this.counts[id] || 0; }
  has(id, n = 1) { return this.count(id) >= n; }

  /** -> {ok, added, reason?:'bag_full'} ; key items hold one unless items.js gives a stack. */
  add(id, n = 1) {
    n = natInt(n);
    if (!id || n <= 0) return { ok: false, added: 0, reason: 'bad' };
    const cap = this.def(id)?.stack ?? (this.isKey(id) ? 1 : this.cfg.stackMax ?? 999); // items.js stack overrides the key cap
    const room = cap - this.count(id);
    if (room <= 0) return { ok: false, added: 0, reason: 'bag_full' };
    const added = Math.min(room, n);
    this.counts[id] = this.count(id) + added;
    this.recent = [id, ...this.recent.filter((x) => x !== id)];
    return { ok: added === n, added, reason: added === n ? undefined : 'bag_full' };
  }
  remove(id, n = 1) {
    n = natInt(n);
    if (n <= 0 || this.count(id) < n) return false;
    this.counts[id] -= n;
    if (!this.counts[id]) { delete this.counts[id]; this.recent = this.recent.filter((x) => x !== id); }
    return true;
  }
  /** Items in one pocket, most recently added first, then by name. */
  pocket(p) {
    const ids = Object.keys(this.counts).filter((id) => this.pocketOf(id) === p);
    const rank = (id) => { const r = this.recent.indexOf(id); return r < 0 ? 1e9 : r; };
    return ids.sort((a, b) => rank(a) - rank(b) || this.nameOf(a).localeCompare(this.nameOf(b))).map((id) => ({ id, n: this.counts[id] }));
  }
  /** Engine/bag format for one pocket (or every pocket with no arg): { itemId: count } */
  exportPocket(p) {
    return Object.fromEntries(Object.entries(this.counts).filter(([id]) => !p || this.pocketOf(id) === p));
  }
  /** Replace one pocket's contents from { itemId: count } (items of other pockets in the map are ignored). */
  importPocket(p, map = {}) {
    for (const id of Object.keys(this.counts)) if (this.pocketOf(id) === p) delete this.counts[id];
    for (const [id, n] of Object.entries(map || {})) if (this.pocketOf(id) === p && natInt(n) > 0) this.counts[id] = natInt(n);
    this.recent = this.recent.filter((id) => this.counts[id]);
  }
  /** What the battle engine may use: { gameItemId: count } of items the engine knows (rules.js buildItems). */
  toEngine() { return Object.fromEntries(Object.entries(this.counts).filter(([id]) => this.def(id)?.battle)); }
  /** Fold KilumenBattle.result().bag back in (same keys as toEngine()). */
  fromEngine(map = {}) {
    for (const [id, n] of Object.entries(map || {})) {
      if (natInt(n) > 0) this.counts[id] = natInt(n); else { delete this.counts[id]; this.recent = this.recent.filter((x) => x !== id); }
    }
  }
  toJSON() { return { ...this.counts }; }

  /**
   * Field use on one creature. -> {ok, reason?, hp?, energy?, cured?, textKey, mode}
   * Remedies: HP by the engine's kHeal (never on a fainted creature: that needs a carer, text system_party.out_cold).
   * Pep Remedy follows cfg.potionsVsRest (Gary pending): 'rest_only' refuses ('rest_only'), 'potions_restore'
   * refills every skill, 'partial_top_up' refills half of each skill (rounded up).
   */
  canUse(id, c) { return this.use(id, c, { dry: true }); }
  use(id, c, { dry = false } = {}) {
    const d = this.def(id), mode = this.cfg.potionsVsRest || 'rest_only';
    if (!this.has(id)) return { ok: false, reason: 'none' };
    if (!d?.field) return { ok: false, reason: 'no_field_use' };
    if (!c) return { ok: false, reason: 'no_target' };
    if (isFainted(c)) return { ok: false, reason: 'out_cold', textKey: 'system_party.out_cold' };
    const out = { ok: true, mode, textKey: `system_party.item_heal.variants.${mode}` };
    if (d.field === 'heal') {
      const mx = maxHp(c), add = Math.min(mx - c.hp, d.heal || 0);
      if (add <= 0) return { ok: false, reason: 'no_effect' };
      if (!dry) c.hp += add;
      out.hp = add;
    } else if (d.field === 'cure') {
      if (!c.status) return { ok: false, reason: 'no_effect' };
      if (!dry) c.status = '';
      out.cured = true; out.textKey = 'system_party.item_heal';
    } else if (d.field === 'energy') {
      if (mode === 'rest_only') return { ok: false, reason: 'rest_only', textKey: 'system_party.item_heal.variants.rest_only' };
      const mx = maxEnergy(c), cur = energyOf(c);
      const next = cur.map((e, i) => (mode === 'partial_top_up' ? Math.min(mx[i], e + Math.ceil(mx[i] / 2)) : mx[i]));
      if (next.every((e, i) => e === cur[i])) return { ok: false, reason: 'no_effect' };
      if (!dry) c.energy = next;
      out.energy = next.reduce((a, e, i) => a + e - cur[i], 0);
    } else return { ok: false, reason: 'no_field_use' };
    if (!dry) this.remove(id, 1);
    return out;
  }
}

// ---- map pickups (World Design: maps/<map>.json items[] = {id, item, x, y, hidden, flag}) -------------------
/** Each placed item's unique flag: World's `flag`, else item_<map>_<id>. */
export const pickupFlag = (mapName, it) => it.flag || `item_${mapName}_${it.id}`;
export const isTbd = (it) => !it.item || /^TBD/.test(it.item);

/** Placed item on (x,y) of `map` (a GameMap or its json), or null. */
export function pickupAt(map, x, y) {
  return (map?.items || []).find((it) => it.x === x && it.y === y) || null;
}

/** Visible, still-there pickups (to draw a satchel and block the cell). */
export function visiblePickups(map, flags, cfg = {}) {
  return (map?.items || []).filter((it) => !it.hidden && (!isTbd(it) || cfg.giveTbdItems)).map((it) => ({ ...it, taken: flags.has(pickupFlag(map.name, it)) }))
    .filter((it) => !it.taken || cfg.emptySatchelStays);
}

/**
 * Collect the pickup `it` on `mapName`. ctx: {flags (Set), bag (Bag), addMoney(n), cfg, lines, vars}
 * -> {ok, kind:'item'|'money'|'key'|'empty'|'full'|'tbd', textKey, vars, flag}
 * Pages come from overworld_lines.json system_items.* (callers fill them); `item` is the catalogue name.
 */
export function collectPickup(mapName, it, { flags, bag, addMoney, cfg = {}, lines = null, setFlag = null } = {}) {
  const flag = pickupFlag(mapName, it);
  const mark = (f) => (setFlag ? setFlag(f) : flags.add(f));
  const T = lines?.system_items || {};
  if (flags.has(flag)) return { ok: false, kind: 'empty', flag, textKey: 'system_items.empty_satchel', pages: T.empty_satchel?.pages || ['An empty supply satchel. Someone beat you to it.'], vars: {} };
  if (isTbd(it) && !cfg.giveTbdItems) return { ok: false, kind: 'tbd', flag, pages: [], vars: {} };
  const name = bag.nameOf(it.item), count = Math.max(1, it.count || 1);
  const money = bag.def(it.item)?.money;
  if (money) {
    const amount = money * count;
    addMoney?.(amount); mark(flag);
    const vars = { item: name, amount: fmtMoney(amount) };
    return { ok: true, kind: 'money', flag, amount, textKey: 'system_items.picked_up_money', pages: T.picked_up_money?.pages || ['You found {item}!', '{amount} goes in your wallet.'], vars };
  }
  const pocket = bag.pocketOf(it.item), vars = { item: name, count, pocket: bag.pocketLabel(pocket) };
  const r = bag.add(it.item, count);
  if (!r.added) return { ok: false, kind: 'full', flag, textKey: 'system_items.bag_full', pages: T.bag_full?.pages || ['Your {pocket} pocket is stuffed.'], vars };
  if (r.added < count) bag.remove(it.item, r.added); // all or nothing: the satchel stays for later
  if (r.added < count) return { ok: false, kind: 'full', flag, textKey: 'system_items.bag_full', pages: T.bag_full?.pages || ['Your {pocket} pocket is stuffed.'], vars };
  mark(flag);
  const key = bag.isKey(it.item) ? 'key_item' : it.hidden ? 'hidden_found' : count > 1 ? 'picked_up_many' : 'picked_up';
  return { ok: true, kind: key === 'key_item' ? 'key' : 'item', flag, item: it.item, textKey: `system_items.${key}`, pages: T[key]?.pages || ['You picked up {item}.'], vars };
}
