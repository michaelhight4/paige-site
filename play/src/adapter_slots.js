// Save slots, start flow and character creation (adapter mixin; pure JS, no DOM).
import * as E from './engine.js';
import { D } from './data.js';
import * as Char from './character.js';
import * as P from './people.js';

const quickHeadline = (s) => {
  const age = Math.floor(s.age), j = s.job && D.careers.find((c) => c.id === s.job.id), pt = s.sl && s.sl.partTime;
  return !s.alive ? 'Deceased' : s.prison ? 'Inmate' : j ? j.levels[s.job.level][0] : pt ? pt.title : s.pro ? 'Pro athlete' : s.retired ? 'Retired' : age < 5 ? 'Child' : s.school ? 'Student' : 'Unemployed';
};
export const slotsApi = {
  // what the app should show on launch: 'play' (a life is loaded), 'create' (no saves yet) or 'lifeline' (saves exist but none is "last played")
  getStartState() { return { mode: this.s ? 'play' : this.startMode || 'create', slot: this.slot }; },
  getSlots() {
    return E.SLOTS.map((n) => {
      const info = E.slotInfo(n), g = info && E.load(n);
      if (!info || !g) return { slot: n, empty: true, current: this.slot === n, last: E.lastSlot() === n };
      const live = this.s && this.slot === n ? this.s : g, age = Math.floor(live.age), char = Char.ensure(live);
      return { slot: n, empty: false, name: live.name, age, alive: live.alive !== false, gen: info.gen || 1, headline: quickHeadline(live), country: (D.life.countries.find((c) => c.id === live.country) || {}).name || '', cash: Math.round(live.cash || 0), savedAt: info.savedAt || 0,
        summary: `Age ${age} · ${quickHeadline(live)}`, current: this.slot === n, last: E.lastSlot() === n, look: { age, layers: Char.layerPaths(char, age), base: D.charLayers.base } };
    });
  },
  loadSlot(n) {
    const g = E.load(n); if (!g || g.v !== 2 || g.alive === undefined) return { ok: false, message: 'That slot is empty.' };
    this.s = g; this.slot = n; E.setSlot(n); if (!this.opts.noSave) E.setLastSlot(n); this.ensureSeen(); return { ok: true, slot: n };
  },
  // start a brand-new life in slot n (overwrites it; the UI asks for confirmation first). o = {first,last,gender,country,look,seed}
  startLife(n, o = {}) {
    if (!E.SLOTS.includes(n)) return { ok: false, message: 'Unknown slot.' };
    const first = String(o.first || '').trim().slice(0, 18) || null, last = String(o.last || '').trim().slice(0, 22) || null;
    this.s = E.newGame({ name: first, last, gender: o.gender, country: o.country, look: o.look, seed: o.seed ?? this.opts.seed }); this.slot = n; E.setSlot(n); this.ensureSeen();
    return { ok: true, slot: n, state: this.getState() };
  },
  getCreatorOptions() {
    const L = D.charLayers, nm = (arr) => arr.map((l) => ({ id: l.id, name: l.name || l.id }));
    return { countries: D.life.countries.map((c) => ({ id: c.id, name: c.name })), genders: [{ id: 'm', label: 'Male' }, { id: 'f', label: 'Female' }], skins: L.skins, eyeColors: L.eyeColors, hairColors: L.hairColors, builds: L.builds, hairs: nm(L.layers.hair), facials: nm(L.layers.facial), facialGenders: ['m'], previewAge: 30 };
  },
  getRandomName(country, gender) { const t = { rs: (Date.now() ^ (Math.random() * 1e9)) | 0 }; return P.genName(t, country || 'us', gender === 'f' ? 'f' : 'm'); },
  getPreviewLook(look, age = 30) { const c = Char.createChar('preview', look || {}); return { age, layers: Char.layerPaths(c, age), base: D.charLayers.base, char: c }; },
};
