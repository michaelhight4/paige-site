// Kilumen party + Field Archive (PC boxes) + starter flow. systems-gd pass, Oct 22, 2026.
// The live party array stays scene.party (overworld.js reads it for the Trail Buddy follower and {lead});
// Party only ever edits that array in place or reassigns scene.party, then asks the scene to refresh the follower.
import { KILUMEN_RULES } from '../battle/data/rules.js?v=v0.2.59-alpha';
import { createCreature, deserialise, serialise, healFull, isFainted, idOf } from './creature.js?v=v0.2.59-alpha';

export const partyMax = (rules = KILUMEN_RULES) => rules.partyMax;

/** Field Archive: boxes of creatures. Save shape (save.js archive block): { boxes: [[creature...], ...] } */
export class Archive {
  constructor(data, cfg) {
    this.cfg = cfg;
    const boxes = Array.isArray(data?.boxes) ? data.boxes : [];
    this.boxes = boxes.map((b) => (Array.isArray(b) ? b : b?.mons || []).map((o) => deserialise(o)).filter(Boolean));
  }
  boxCount(idLevel = 1) { return this.cfg.archiveBoxes + (idLevel >= this.cfg.archiveExtraAtIdLevel ? this.cfg.archiveExtraBoxes : 0); }
  box(i) { while (this.boxes.length <= i) this.boxes.push([]); return this.boxes[i]; }
  get size() { return this.boxes.reduce((n, b) => n + b.length, 0); }
  /** First box with room; null when every box is full. */
  deposit(c, idLevel = 1, from = 0) {
    if (this.size >= (this.cfg.storageCap ?? 250)) return null; // company storage: 250 slots
    const n = this.boxCount(idLevel);
    for (let k = 0; k < n; k++) {
      const i = (from + k) % n, b = this.box(i);
      if (b.length < this.cfg.archiveBoxSize) { b.push(c); return { box: i, slot: b.length - 1 }; }
    }
    return null;
  }
  take(box, slot) { const b = this.boxes[box]; return b && b[slot] ? b.splice(slot, 1)[0] : null; }
  toJSON() { return { boxes: this.boxes.map((b) => b.map(serialise)) }; }
}

export class Party {
  /** host: { party (array, read/write), onLeadChange?() }, archive: Archive, cfg, flags?: {has, set} */
  constructor(host, archive, cfg, flags = null) {
    this.host = host; this.archive = archive; this.cfg = cfg; this.flags = flags;
    // upgrade soul-pass / save entries in place (keep the same objects the overworld already holds)
    const all = (host.party || []).filter((o) => o && typeof o.species === 'string').map((o) => Object.assign(o, deserialise(o)));
    for (const extra of all.splice(partyMax())) archive.deposit(extra); // over the cap (old saves / dev ?lead): to the Archive
    host.party = all;
  }
  get list() { // entries added by older code paths (dev ?lead) get the full shape on first touch
    const l = this.host.party;
    for (const o of l) if (!o.uid) Object.assign(o, deserialise(o));
    return l;
  }
  get size() { return this.list.length; }
  get full() { return this.size >= partyMax(); }
  lead() { return this.list[0] || null; }
  /** First creature able to battle (the one sent out first). */
  firstAble() { return this.list.find((c) => !isFainted(c)) || null; }
  allFainted() { return this.size > 0 && this.list.every(isFainted); }
  indexOf(uid) { return this.list.findIndex((c) => idOf(c) === uid); }

  /** Add to the party, or send to the Field Archive when the party is full. -> {where:'party'|'archive'|'none', index|box,slot} */
  add(c, idLevel = 1) {
    if (!this.full) { this.list.push(c); this._changed(this.size === 1); return { where: 'party', index: this.size - 1 }; }
    const at = this.archive.deposit(c, idLevel);
    return at ? { where: 'archive', ...at } : { where: 'none' };
  }

  /** Move member `from` to position `to` (others shift). Index 0 is the lead (Trail Buddy + {lead}). */
  reorder(from, to) {
    const L = this.list;
    if (from === to || !L[from] || to < 0 || to >= L.length) return false;
    const leadBefore = L[0];
    const [c] = L.splice(from, 1); L.splice(to, 0, c);
    this._changed(L[0] !== leadBefore);
    return true;
  }
  swap(i, j) {
    const L = this.list;
    if (i === j || !L[i] || !L[j]) return false;
    const leadBefore = L[0];
    [L[i], L[j]] = [L[j], L[i]];
    this._changed(L[0] !== leadBefore);
    return true;
  }
  setLead(i) { return this.reorder(i, 0); }
  /** Replace the whole order by uids (SortableJS drag). Unknown uids are ignored; missing ones keep their order. */
  setOrder(uids) {
    const L = this.list, leadBefore = L[0];
    const picked = uids.map((u) => L.find((c) => idOf(c) === u)).filter(Boolean);
    const rest = L.filter((c) => !picked.includes(c));
    L.splice(0, L.length, ...picked, ...rest);
    this._changed(L[0] !== leadBefore);
  }

  /** Party -> archive. The last creature able to battle can never be stored. */
  depositAt(i, idLevel = 1) {
    const c = this.list[i];
    if (!c) return { ok: false, reason: 'none' };
    if (this.list.filter((x) => x !== c && !isFainted(x)).length === 0) return { ok: false, reason: 'last_one' };
    const at = this.archive.deposit(c, idLevel);
    if (!at) return { ok: false, reason: 'box_full' };
    this.list.splice(i, 1); this._changed(i === 0);
    return { ok: true, ...at };
  }
  /** v0.2.13 sell: remove team creature i; never the last one able to battle. */
  sellAt(i) {
    const c = this.list[i];
    if (!c) return { ok: false, reason: 'none' };
    if (this.list.filter((x) => x !== c && !isFainted(x)).length === 0) return { ok: false, reason: 'last_one' };
    this.list.splice(i, 1); this._changed(i === 0);
    return { ok: true, c };
  }
  withdraw(box, slot) {
    if (this.full) return { ok: false, reason: 'team_full' };
    const c = this.archive.take(box, slot);
    if (!c) return { ok: false, reason: 'none' };
    this.list.push(c); this._changed(this.size === 1);
    return { ok: true, index: this.size - 1 };
  }

  healAll() { for (const c of this.list) healFull(c); }

  /** Starter flow: create the chosen starter, add it as the lead and set the starter flag. */
  chooseStarter(species, { nickname = null, origin = null } = {}) {
    const flag = this.cfg.starterFlag;
    if (this.flags?.has(flag)) return { ok: false, reason: 'already' };
    const c = createCreature({ species, level: this.cfg.starterLevel, nickname, origin: origin || { how: 'starter' } });
    this.list.unshift(c);
    if (this.size > partyMax()) this.archive.deposit(this.list.pop());
    this.flags?.set(flag, true);
    this._changed(true);
    return { ok: true, creature: c };
  }

  toJSON() { return this.list.map(serialise); }
  _changed(leadChanged) { this.host.onPartyChange?.(leadChanged); }
}
