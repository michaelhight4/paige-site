// Fishing gear v1 (Coder, Oct 29 2026; design/FISHING_GEAR.md, approved by Gary). Fills rarity tags, the baits block,
// species elements and the good/super tables in data/fishing_tables.json. Re-runnable: node tools/fishing/gen_gear_tables.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { SYNCED_SPECIES } from '../../src/ui/species_synced.gen.js';
const P = new URL('../../data/fishing_tables.json', import.meta.url);
const enc = JSON.parse(readFileSync(new URL('../../data/encounters_wired.json', import.meta.url)));
const d = JSON.parse(readFileSync(P));
const wired = new Set(Object.values(enc.zones).flatMap((z) => z.slots.map((s) => s.species)));
// Elements: hand-written species in src/ui/data.js (regex: it imports browser modules) + the synced list.
const EL = Object.fromEntries(SYNCED_SPECIES.map((s) => [s.id, s.el || []]));
for (const m of readFileSync(new URL('../../src/ui/data.js', import.meta.url), 'utf8').matchAll(/id: '(\w+)', name: '[^']*', el: \[([^\]]*)\]/g)) EL[m[1]] = [...m[2].matchAll(/'(\w+)'/g)].map((x) => x[1]);
// Gary (Oct 29 2026, hard rule): fishing catches ONLY water-type Kilumen (el includes 'water').
const isWater = (sp) => (EL[sp] || []).includes('water');
const removed = {};
d.version = 2;
d.note = 'Fishing tables. Per map, per rod tier (basic / good / super). Species come ONLY from the water species in data/encounters_wired.json. Slot rarity: common | uncommon | rare (untagged = common). good/super filled by tools/fishing/gen_gear_tables.mjs (design/FISHING_GEAR.md). Levels and weights PLACEHOLDER.';
d.rods = { basic: { tier: 1, bite: 0.7 }, good: { tier: 2, bite: 0.8 }, super: { tier: 3, bite: 0.9 } };
d.bite_clamp = [0.05, 0.95];
d.baits = {
  ripple_grub: { bite: 0.10 },
  reed_nymph: { bite: 0.05, element: 'freshwater', elementMult: 2 },
  brine_fleck: { bite: 0.05, element: 'sea', elementMult: 2 },
  glimmer_worm: { bite: 0.05, rare: 2 },
  deepgut_paste: { bite: -0.05, rare: 3, uncommon: 1.5 },
  lantern_moth: { bite: 0.05, uncommon: 2, earned: true }, // reworked (water-only rule): no water species has a light secondary
  hollowstar_roe: { bite: 0.05, rare: 3, earned: true },
};
d.water_only = true;
d.water_species = d.water_species.filter(isWater);
const water = d.water_species.filter((s) => wired.has(s));
d.species_el = Object.fromEntries(d.water_species.map((s) => [s, EL[s]]));
const RARE_ALWAYS = new Set(['moorcoil']); // story rare (design §3: hand tag wins)
const tag = (slots) => { for (const s of slots) if (RARE_ALWAYS.has(s.species)) s.rarity = 'rare'; const tot = slots.reduce((a, s) => a + s.weight, 0);
  for (const s of slots) { const sh = s.weight / tot; s.rarity = s.rarity || (sh >= 0.4 ? 'common' : sh >= 0.1 ? 'uncommon' : 'rare'); } return slots; };
const up = (lv, n) => (Array.isArray(lv) ? [lv[0] + n, lv[1] + n] : [lv + n, lv + n]);
const kind = (sp) => ((EL[sp] || []).includes('freshwater') ? 'freshwater' : 'sea');
const HAND = { // design §6 sample map, exact
  lanternport: { // basic rebuilt after the water-only rule removed mooncrab + seaglint (was reefshell 15 + moorcoil 2 = 12% rare)
    basic: [['reefshell', 60, [42, 45], 'common'], ['brineseal', 25, [42, 46], 'uncommon'], ['moorcoil', 2, [42, 46], 'rare']],
    good: [['reefshell', 55, [45, 48], 'common'], ['brineseal', 20, [45, 48], 'uncommon'], ['moorcoil', 8, [45, 49], 'rare']],
    super: [['reefshell', 40, [48, 52], 'common'], ['brineseal', 20, [49, 52], 'uncommon'], ['tuskwallow', 15, [48, 52], 'uncommon'], ['moorcoil', 12, [49, 53], 'rare']],
  },
};
for (const [m, t] of Object.entries(d.maps)) {
  const drop = t.basic.slots.filter((s) => !isWater(s.species)).map((s) => s.species);
  if (drop.length) removed[m] = [...new Set(drop)];
  t.basic.slots = t.basic.slots.filter((s) => isWater(s.species));
  if (!t.basic.slots.length) { t.good = t.super = null; continue; }
  tag(t.basic.slots);
  if (HAND[m]) { for (const k of ['basic', 'good', 'super']) t[k] = { from: t.basic.from, slots: HAND[m][k].map(([species, weight, level, rarity]) => ({ species, weight, level, rarity })) }; continue; }
  const have = new Set(t.basic.slots.map((s) => s.species));
  const fam = kind(t.basic.slots[0].species);
  const extra = water.find((s) => !have.has(s) && kind(s) === fam && s.length % 3 === m.length % 3) || water.find((s) => !have.has(s) && kind(s) === fam);
  const hasRare = t.basic.slots.some((s) => s.rarity === 'rare');
  const mk = (lv, rareMult, extraW) => {
    const slots = t.basic.slots.map((s) => ({ species: s.species, weight: s.rarity === 'rare' ? s.weight * rareMult : s.weight, level: up(s.level, lv), rarity: s.rarity }));
    const top = Math.max(...slots.map((s) => s.level[1]));
    slots.push({ species: extra, weight: extraW, level: [top - 2, top + 1], rarity: hasRare ? 'uncommon' : 'rare' });
    // cap the rare share (good 15%, super 25%) so tables with many rare slots stay hard
    const bw = t.basic.slots.reduce((a, x) => a + x.weight, 0), bs = t.basic.slots.filter((x) => x.rarity === 'rare').reduce((a, x) => a + x.weight, 0) / bw;
    const cap = Math.max(lv === 3 ? 0.15 : 0.25, bs * (lv === 3 ? 1.2 : 1.4)), R = slots.filter((x) => x.rarity === 'rare'), rw = R.reduce((a, x) => a + x.weight, 0), ow = slots.reduce((a, x) => a + x.weight, 0) - rw;
    if (rw / (rw + ow) > cap) { const k = (cap * ow) / ((1 - cap) * rw); for (const x of R) x.weight = Math.max(1, Math.round(x.weight * k)); }
    return slots;
  };
  t.good = { from: t.basic.from, slots: mk(3, 4, hasRare ? 10 : 4) };
  t.super = { from: t.basic.from, slots: mk(6, 6, hasRare ? 14 : 8) };
}
writeFileSync(P, JSON.stringify(d, null, 1) + '\n');
console.log('maps', Object.keys(d.maps).length, 'removed (non-water)', JSON.stringify(removed), 'empty', Object.keys(d.maps).filter((m) => !d.maps[m].basic.slots.length));
