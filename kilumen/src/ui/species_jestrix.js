// Jestrix line (Coder, Oct 29 2026; Gary approved the v2 line art). Hand-written, NOT generated: tools/sync_creatures.mjs
// rewrites species_synced.gen.js, so this 5-stage line lives in its own module and is merged into SPECIES (src/ui/data.js)
// in Kilindex (dex) order. Art: art/characters/pixel/creatures/<id>/ (same layout as the synced sets).
// Dex: Jestrix keeps its DEX #274; the four new forms take the next free numbers after the cute sets (max was 478).
// Evolution levels: the game's 16 / 32 curve for the first two steps, then every 12 levels so the final form lands
// before the late game (16 / 32 / 44 / 56).
// Stats: same type lean as the synced Dark/Devil species (dark 70% + devil 30%, uncommon x1.04); totals step
// 296 / 348 / 413 / 468 / 525 (3-stage lines end at ~480-500, a 5-stage final sits a little above).
// Skills: the shared 'dark' pool, like every other Dark/Devil species. Blurbs: TODO text ids for Text Bot
// (data/textbot_requests_jestrix.md); text/*.py is not edited here.
const st = (hp, atk, def, spa, spd, spe) => ({ hp, atk, def, spa, spd, spe });
const base = (id, name, dex, stage, prevo, evo, evoLevel, baseStats, catchRate, baseXp) => ({
  id, name, el: ['dark', 'devil'], line: 'dex:jestrix', found: 'Sunmeadow', blurb: '', blurbKey: `system_kilindex.entries.${id}.blurb`,
  dex, rarity: 'uncommon', stage, prevo, evo, ...(evoLevel ? { evoLevel } : {}), baseStats, catchRate, baseXp, skillPool: 'dark',
  icon: { stem: `creatures/${id}/icons/${id}_icon_f` }, synced: true, ph: 1, art: 'approved',
});
export const JESTRIX_LINE = [
  base('jestrix', 'Jestrix', 274, 0, null, 'japkit', null, st(45, 56, 44, 52, 44, 55), 0.48, 50),
  base('japkit', 'Japkit', 479, 1, 'jestrix', 'harlequop', 16, st(53, 66, 52, 62, 51, 64), 0.38, 90),
  base('harlequop', 'Harlequop', 480, 2, 'japkit', 'mummerhop', 32, st(63, 78, 62, 73, 61, 76), 0.28, 130),
  base('mummerhop', 'Mummerhop', 481, 3, 'harlequop', 'maestrix', 44, st(71, 89, 70, 83, 69, 86), 0.2, 170),
  base('maestrix', 'Maestrix', 482, 4, 'mummerhop', null, 56, st(80, 99, 79, 93, 77, 97), 0.12, 210),
];
