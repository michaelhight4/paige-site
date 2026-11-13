// Kilumen overworld: optional lighting variants (Oct 22, 2026). CONFIG.litGreensAtNight (default OFF; dev ?litgreens=1|0).
// "Keep greens lit at night" (art/world/overworld/qa/depth_3d/CODER_LIST.md item 5, optional, Gary's call):
// at dusk/night the kit's lit grade keeps only cream/amber + violets lit and sends greens to dim blues. With the flag on,
// on the maps listed here the 12 palette greens keep their day colour INSIDE THE EMISSIVE MASK ONLY (club_dance_a/b
// are whole-tile emissive; club_front sign boxes). Nothing else changes: base grade, sprites, shadows, LUTs.
// Side effect to know: any other emissive green pixel on these maps (e.g. a green crystal) also stays day-green.
export const LIT_GREENS = ['18382c', '24522e', '244e34', '38683e', '367634', '246e6c', '52983a', '54864e', '3e9c92', '78ba48', 'a6d460', '70cab8'];
export const LIT_GREENS_MAPS = ['club_int', 'fernwick'];
export const LIT_GREENS_PHASES = ['dusk', 'night'];

const variants = new WeakMap(); // base grade -> its lit-greens copy (own image cache)

/** Should the lit-greens grade be used here? (flag on, listed map, dusk/night grade) */
export function wantsLitGreens(on, mapName, gradeName) {
  return !!on && LIT_GREENS_MAPS.includes(mapName) && LIT_GREENS_PHASES.includes(gradeName);
}

/** A copy of a prepared grade (palette.js prepareGrade) whose litMap keeps the greens at their day colour. */
export function litGreensGrade(grade) {
  if (!grade) return grade;
  let g = variants.get(grade);
  if (!g) {
    const litMap = new Map(grade.litMap || grade.map);
    for (const h of LIT_GREENS) { const k = parseInt(h, 16); litMap.set(k, k); }
    g = { ...grade, name: grade.name + '+greens', identity: false, litMap, cache: new WeakMap() };
    variants.set(grade, g);
  }
  return g;
}
