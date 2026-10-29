// Battle ground platforms, one entry per biome (battle fix pass, Oct 22, 2026). Kilumen's own art, drawn in code: an oval
// patch of ground each creature stands on, the far (foe) one smaller for perspective. Each biome supplies its battle
// background and a palette; drawPlatform() turns the palette into a small pixel-art PNG (data URL, cached) that the battle
// screen (src/battle/ui_sd.js) shows with image-rendering: pixelated. 'grass' and 'water' exist. To add a biome, add an entry
// here with its own `bg` and colours and pass `biome` in the battle opts; nothing else changes.
// Colours for 'grass' were sampled from art/world/battle_bg.png (meadow ground, #a0a331 to #c1be2b).
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
  // 'water' (fishing battles, Oct 29 2026): live backdrop drawn in code (src/battle/data/water_bg.js) over a static
  // fallback PNG; near = the wooden end of the pier, far = a foamy ripple patch on the water. Per-size palettes.
  water: {
    bg: 'art/world/battle_bg_water.png', live: 'water',
    near: { shadow: 'rgba(10, 30, 60, 0.40)', rim: '#3c2414', side: '#6b4224', top: '#8a5a32', light: '#a87444', fleck: ['#6b4224', '#b88352', '#5a3620'], tuft: '#2e1a0e', feet: 'rgba(30, 16, 8, 0.36)' },
    far: { shadow: 'rgba(10, 40, 80, 0.35)', rim: '#2a6fae', side: '#3a86c8', top: '#6fb8e8', light: '#a6d8f4', fleck: ['#eaf8ff', '#ffffff', '#4f9ad6'], tuft: '#eaf8ff', feet: 'rgba(16, 60, 110, 0.32)' },
  },
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
