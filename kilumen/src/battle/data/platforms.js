// Battle ground platforms, one entry per biome (battle fix pass, Oct 22, 2026). Kilumen's own art, drawn in code: an oval
// patch of ground each creature stands on, the far (foe) one smaller for perspective. Each biome supplies its battle
// background and a palette; drawPlatform() turns the palette into a small pixel-art PNG (data URL, cached) that the battle
// screen (src/battle/ui_sd.js) shows with image-rendering: pixelated. 'grass' (drawn platforms) plus painted 'water', 'cave', 'mountain', 'snow'. To add a biome, add an entry
// here with its own `bg` and colours and pass `biome` in the battle opts; nothing else changes.
// Colours for 'grass' were sampled from art/world/battle_bg.png (meadow ground, #a0a331 to #c1be2b).
const PHASES = ['dawn', 'day', 'dusk', 'night'], ph = (p) => (PHASES.includes(p) ? p : 'day');
const artBg = (b, p) => `art/world/battle_biomes/${b}/bg_${ph(p)}.webp`, artLife = (b, p) => `art/world/battle_biomes/${b}/life_${ph(p)}.webp`;
const r56 = (b, near, far) => ({ bg: artBg(b, 'day'), art: true, bgFor: (phase) => artBg(b, phase), life: (phase) => artLife(b, phase), spots: { near, far } });
export const PLATFORM_BIOMES = {
  grass: {
    bg: 'art/world/battle_bg.png',
    shadow: 'rgba(38, 44, 10, 0.42)',  // contact shadow on the background under the patch
    rim: '#46501a',                     // darker outline / edge of the patch
    side: '#6d7724',                    // the visible front face (gives it a little thickness)
    top: '#99a42f',                     // top surface, close to the meadow colour
    light: '#b7bf45',                   // slightly lighter top (light from above)
    fleck: ['#87922a', '#c8ce5c', '#7c8626'], // dither flecks for texture
    tuft: '#5e6a20',                    // grass tufts poking over the rim
    feet: 'rgba(40, 46, 12, 0.38)',     // soft contact shadow where the feet rest
  },
  // Painted biome backdrops (Animator, grass battle screen quality; Gary approved live Oct 29 2026). Each is 4 phase stills
  // (2560x1440 webp) + an animated life layer (16 frames x 120 ms, 1280x720 animated webp) under art/world/battle_biomes/<biome>/.
  // bgFor(phase) picks the still from the game clock; art: true = the ground is painted in, so drawPlatform is skipped and the
  // creatures stand on `spots` (frame fractions from that biome's index.json). Nothing loads until a battle of that biome opens.
  // 'water' replaces the old pixel water set (fishing / surf battles); its night and dusk are Animator's auto-graded phases.
  water: { bg: artBg('water', 'day'), art: true, bgFor: (phase) => artBg('water', phase), life: (phase) => artLife('water', phase), spots: { near: [0.24, 0.66], far: [0.66, 0.49] } },
  cave: { bg: artBg('cave', 'day'), art: true, bgFor: (phase) => artBg('cave', phase), life: (phase) => artLife('cave', phase), spots: { near: [0.3, 0.79], far: [0.69, 0.72] } },
  mountain: { bg: artBg('mountain', 'day'), art: true, bgFor: (phase) => artBg('mountain', phase), life: (phase) => artLife('mountain', phase), spots: { near: [0.3, 0.81], far: [0.73, 0.735] } },
  snow: { bg: artBg('snow', 'day'), art: true, bgFor: (phase) => artBg('snow', phase), life: (phase) => artLife('snow', phase), spots: { near: [0.31, 0.68], far: [0.755, 0.58] } },
  // Regions 5-6 (Animator art package #5, Gary approved Oct 29 2026): same format; spots from each index.json spots_frac.
  bog: r56('bog', [0.322, 0.747], [0.703, 0.582]),
  bog_deep: r56('bog_deep', [0.337, 0.75], [0.674, 0.674]),
  causeway: r56('causeway', [0.332, 0.743], [0.747, 0.472]),
  coast: r56('coast', [0.303, 0.78], [0.737, 0.668]),
  hall_mirefen: r56('hall_mirefen', [0.405, 0.755], [0.646, 0.538]),
  hall_tidewater: r56('hall_tidewater', [0.298, 0.738], [0.762, 0.616]),
  lab_mirefen: r56('lab_mirefen', [0.312, 0.8], [0.72, 0.686]),
  lab_seacave: r56('lab_seacave', [0.376, 0.816], [0.695, 0.646]),
  meadow: r56('meadow', [0.293, 0.743], [0.728, 0.639]),
  reef_surf: r56('reef_surf', [0.332, 0.712], [0.747, 0.573]),
  sea_cave: r56('sea_cave', [0.371, 0.743], [0.664, 0.587]),
  // Research lab interior (Oct 30 2026): Kilumen pixel art drawn in code (tools/lab_battle_bg/gen.py, 320x180 x8 nearest), metal
  // pads with light rings at the spots; life layer = tank bubbles, rack LEDs, monitor blink (off under reduced motion like every life layer).
  lab: r56('lab', [0.3, 0.8], [0.72, 0.665]),
};
// Sizes in art pixels. Shown at --b-plat-px CSS px per art pixel x sprite scale (2 on PC, 1.5 on phones; .b-plat in
// src/ui/ui.css), i.e. a little chunkier than the 128px creature sprites, in Kilumen's 64px pixel style.
export const PLATFORM_SIZES = { near: { w: 88, h: 22 }, far: { w: 70, h: 18 } };

const cache = new Map();
// tiny deterministic PRNG so flecks/tufts are the same every battle
const rng = (s) => () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
export function drawPlatform(biome = 'grass', size = 'near') {
  const key = `${biome}:${size}`; if (cache.has(key)) return cache.get(key);
  const base = PLATFORM_BIOMES[biome] || PLATFORM_BIOMES.grass, pal = base[size] || base, { w, h } = PLATFORM_SIZES[size] || PLATFORM_SIZES.near;
  const c = document.createElement('canvas'); c.width = w; c.height = h + 3; const g = c.getContext('2d');
  // pixel-perfect filled ellipse (no anti-aliasing so it matches the sprites' hard pixels)
  const oval = (cx, cy, rx, ry, col) => { g.fillStyle = col; for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) { const dy = (y + 0.5 - cy) / ry; if (Math.abs(dy) > 1) continue; const dx = rx * Math.sqrt(1 - dy * dy); g.fillRect(Math.round(cx - dx), y, Math.max(0, Math.round(cx + dx) - Math.round(cx - dx)), 1); } };
  const inOval = (x, y, cx, cy, rx, ry) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  const cx = w / 2, ry = h / 2 - 1.5, cyTop = h / 2 - 1;
  oval(cx, cyTop + 3.5, w / 2, ry + 0.5, pal.shadow);           // contact shadow on the ground behind/below
  oval(cx, cyTop + 2, w / 2 - 0.5, ry + 0.5, pal.rim);          // rim, lower = the edge you see
  oval(cx, cyTop + 1.5, w / 2 - 1.5, ry - 0.5, pal.side);       // front face
  oval(cx, cyTop, w / 2 - 1, ry, pal.rim);                      // top outline
  oval(cx, cyTop, w / 2 - 2, ry - 1, pal.top);                  // top surface
  oval(cx - w * 0.06, cyTop - ry * 0.25, w / 2 - w * 0.2, ry * 0.5, pal.light); // lighter top (light from upper left)
  const r = rng(w * 31 + h);
  for (let i = 0; i < w * 0.9; i++) { const x = Math.floor(r() * w), y = Math.floor(r() * h); if (inOval(x, y, cx, cyTop, w / 2 - 3, ry - 1.5)) { g.fillStyle = pal.fleck[i % pal.fleck.length]; g.fillRect(x, y, 1, 1); } }
  oval(cx, cyTop + ry * 0.1, w * 0.22, ry * 0.42, pal.feet);    // soft contact shadow where the creature stands
  g.fillStyle = pal.tuft;                                        // tufts over the rim (1x2 / 1x3 blades)
  for (let i = 0; i < Math.round(w / 9); i++) { const t = 0.08 + 0.84 * r(), x = Math.round(w * t), dy = (x + 0.5 - cx) / (w / 2 - 1); const y = Math.round(cyTop + ry * Math.sqrt(Math.max(0, 1 - dy * dy))); g.fillRect(x, y - 2, 1, 2 + (i % 2)); }
  const url = c.toDataURL('image/png'); cache.set(key, url); return url;
}
