// Overnight systems (Oct 23, 2026): C15 / M1 Kilindex logging. OVERNIGHT flag `kilindex` (default ON).
// Writes the save v2 `kilindex` block (format: src/overworld/save.js v2Defaults): seen{species:count}, caught{species:n},
// regions{species:[zone ids]}, skills{species:[skill ids known]}. Seen = every foe met in a battle; caught = a catch or
// the starter. A first registration queues system_kilindex.new_entry. The phone Kilindex screen reads this block.
export function emptyKilindex() { return { seen: {}, caught: {}, transferred: {}, minW: {}, maxW: {}, regions: {}, variants: {}, skills: {} }; }

export class Kilindex {
  constructor(saved, party = []) {
    this.data = { ...emptyKilindex(), ...(saved && typeof saved === 'object' ? JSON.parse(JSON.stringify(saved)) : {}) };
    for (const k of Object.keys(emptyKilindex())) if (!this.data[k] || typeof this.data[k] !== 'object') this.data[k] = {};
    for (const c of party) if (c?.species) { // older saves: the team counts as seen + registered
      this.data.seen[c.species] ||= 1;
      this.data.caught[c.species] ||= 1;
      this.knowSkills(c.species, c.skills);
    }
  }
  get seenCount() { return Object.keys(this.data.seen).length; }
  get caughtCount() { return Object.keys(this.data.caught).length; }
  isSeen(sp) { return !!this.data.seen[sp]; }
  isCaught(sp) { return !!this.data.caught[sp]; }

  /** -> true when this is the first time the species was seen. */
  markSeen(sp, zone = null) {
    if (!sp) return false;
    const first = !this.data.seen[sp];
    this.data.seen[sp] = (this.data.seen[sp] || 0) + 1;
    if (zone) { const r = (this.data.regions[sp] ||= []); if (!r.includes(zone)) r.push(zone); }
    return first;
  }
  /** -> true when this is the first registration (new_entry line). */
  markCaught(sp, { zone = null, variant = '', skills = null } = {}) {
    if (!sp) return false;
    this.markSeen(sp, zone);
    const first = !this.data.caught[sp];
    this.data.caught[sp] = (this.data.caught[sp] || 0) + 1;
    if (variant) { const v = (this.data.variants[sp] ||= []); if (!v.includes(variant)) v.push(variant); }
    this.knowSkills(sp, skills);
    return first;
  }
  knowSkills(sp, ids) {
    if (!sp || !ids?.length) return;
    const s = (this.data.skills[sp] ||= []);
    for (const id of ids) if (id && !s.includes(id)) s.push(id);
  }
  toJSON() { return JSON.parse(JSON.stringify(this.data)); }
}
