// Day / night encounter slots (Coder, Oct 30 2026; Gary: "day and night must change which Kilu you can catch").
// Structured like a three-band grass table (morning / day / night) on top of the game's existing outdoor phases
// (scene.phase: dawn / day / dusk / night, time_of_day/grades.json). Bands (src/battle/encounters.js TOD_OF):
//   morning = dawn, day = day + dusk, night = night.
// Every live table gets 2-3 night-only slots (time: ["night"]) and 1-2 day-only slots (time: ["dawn","day","dusk"]),
// picked by type fit from species with art: night = dark / ghost / bug / spirit / demon / devil; day = light / grass /
// fire / angelic / bird. Only species the table doesn't already hold, that pass the runtime habitat rule (surf = water,
// caves = cave dwellers) and whose form fits the table's level band. Levels = the table's own range (unchanged).
// Slots carry "spread": "tod" so the script is idempotent (strips and re-adds). Authored slots are never touched.
// Usage: node tools/encounters/tod_spread.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const TAG = 'tod';
export const NIGHT_EL = ['dark', 'ghost', 'bug', 'spirit', 'demon', 'devil'];
export const DAY_EL = ['light', 'grass', 'fire', 'angelic', 'bird'];
export const NIGHT_TIME = ['night'], DAY_TIME = ['dawn', 'day', 'dusk'];
export const COUNT = { night: 3, nightMin: 2, day: 2, dayMin: 1 };
export const FILES = { source: 'art/world/overworld/encounters/encounters.json', wired: 'data/encounters_wired.json' };
const BAN = /^tbd|jestrix|japkit|harlequop|mummerhop|maestrix/i;
const hash = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

export const liveZone = (z) => !z.inert && !/fishing/i.test(z.method || '') && (z.slots || []).length > 0;

/** Form fits the band: reached at or below lo, and not evolving away before lo. */
function formFits(byId, id, lo) {
  const s = byId(id); if (!s) return false;
  if (Number.isFinite(s.evoLevel) && s.evoLevel > lo) return false;
  const nx = s.evo && byId(s.evo);
  if (nx && Number.isFinite(nx.evoLevel) && lo >= nx.evoLevel) return false;
  return true;
}

export function todSlots(zid, z, ctx, used) {
  const own = (z.slots || []).filter((s) => s.spread !== TAG);
  const base = own.filter((s) => s.spread !== 'habitat');
  const W = own.reduce((a, s) => a + (s.weight || 0), 0);
  const lo = Math.min(...base.map((s) => s.level[0])), hi = Math.max(...base.map((s) => s.level[1]));
  const have = new Set(own.map((s) => s.species));
  const ok = (id) => !have.has(id) && !BAN.test(id) && ctx.hasArt(id) && ['common', 'uncommon', 'rare'].includes(ctx.byId(id).rarity)
    && formFits(ctx.byId, id, lo) && ctx.habitatOk(z.method, id);
  const pick = (els, n, taken) => ctx.ids.filter((id) => ok(id) && !taken.has(id) && (ctx.byId(id).el || []).some((e) => els.includes(e)))
    .sort((a, b) => (used[a] || 0) - (used[b] || 0) || (ctx.byId(a).rarity === 'rare') - (ctx.byId(b).rarity === 'rare') || hash(zid + a) - hash(zid + b)).slice(0, n);
  const taken = new Set();
  const night = pick(NIGHT_EL, COUNT.night, taken); night.forEach((id) => taken.add(id));
  const day = pick(DAY_EL.filter(Boolean), COUNT.day, new Set([...taken, ...night]));
  const w = Math.max(2, Math.round(W * 0.05));
  const out = [];
  for (const id of night) { used[id] = (used[id] || 0) + 1; out.push({ species: id, level: [lo, hi], weight: w, time: NIGHT_TIME, tod: 'night', spread: TAG }); }
  for (const id of day) { used[id] = (used[id] || 0) + 1; out.push({ species: id, level: [lo, hi], weight: w, time: DAY_TIME, tod: 'day', spread: TAG }); }
  return out;
}

export async function apply() {
  const D = await import(path.join(root, 'src/ui/data.js'));
  const { habitatOk } = await import(path.join(root, 'src/battle/encounters.js'));
  const byId = (id) => D.SPECIES.find((s) => s.id === id);
  const art = (id) => fs.existsSync(path.join(root, 'art/characters/pixel/creatures', id));
  const ctx = { byId, ids: D.SPECIES.map((s) => s.id).sort(), hasArt: art,
    habitatOk: (m, id) => habitatOk(m, id, (x) => byId(x)?.el, (x) => byId(x)?.found) };
  const out = {}, picks = {};
  const used = {};
  for (const key of ['wired', 'source']) {
    const rel = FILES[key], txt = fs.readFileSync(path.join(root, rel), 'utf8'), d = JSON.parse(txt);
    const ind = (txt.match(/\n( +)"/) || [, ' '])[1].length;
    for (const [zid, z] of Object.entries(d.zones || {})) {
      z.slots = (z.slots || []).filter((s) => s.spread !== TAG);
      if (!liveZone(z)) continue;
      if (!picks[zid]) picks[zid] = todSlots(zid, z, ctx, used);
      const base = z.slots.filter((s) => s.spread !== 'habitat'), lo = Math.min(...base.map((s) => s.level[0])), hi = Math.max(...base.map((s) => s.level[1]));
      z.slots = [...z.slots, ...picks[zid].map((s) => ({ ...s, level: [lo, hi], time: [...s.time] }))]; // same species, this file's own range
    }
    out[rel] = JSON.stringify(d, null, ind) + (txt.endsWith('\n') ? '\n' : '');
  }
  return { out, picks };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const check = process.argv.includes('--check'), { out, picks } = await apply();
  let stale = 0;
  for (const [rel, txt] of Object.entries(out)) {
    const f = path.join(root, rel);
    if (fs.readFileSync(f, 'utf8') === txt) continue;
    stale++; if (check) console.log(`stale: ${rel}`); else fs.writeFileSync(f, txt);
  }
  if (process.argv.includes('--table')) for (const [z, s] of Object.entries(picks)) console.log(`| ${z} | ${s.filter((x) => x.tod === 'night').map((x) => x.species).join(', ')} | ${s.filter((x) => x.tod === 'day').map((x) => x.species).join(', ')} | ${s[0]?.level.join('-') ?? ''} |`);
  if (check && stale) process.exit(1);
  console.log(check ? 'tod spread: ok' : `tod spread: ${stale} file(s) written`);
}
