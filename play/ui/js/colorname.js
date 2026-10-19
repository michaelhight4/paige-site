// Real colour names for any hex swatch (nearest named colour in RGB space). Used instead of numbered labels like "Colour 3".
const T = [['Black', '#000000'], ['Charcoal', '#2b2a3a'], ['Graphite', '#4a4a55'], ['Grey', '#808080'], ['Silver', '#c0c0c0'], ['White', '#ffffff'], ['Ivory', '#f5f0e1'], ['Cream', '#f3e5ab'],
  ['Red', '#e53935'], ['Crimson', '#b0182c'], ['Maroon', '#7a1f2b'], ['Burgundy', '#5e1224'], ['Coral', '#ff7f6e'], ['Pink', '#ff7ab8'], ['Rose', '#e8668a'], ['Magenta', '#c2188b'], ['Orange', '#f28c28'], ['Burnt orange', '#cc5500'], ['Peach', '#ffc09f'],
  ['Gold', '#f2c14e'], ['Yellow', '#f7e04a'], ['Mustard', '#d4a017'], ['Lime', '#9bd23c'], ['Green', '#3a9d5d'], ['Forest green', '#1f5f3a'], ['Olive', '#707a2b'], ['Mint', '#8fd9b6'], ['Teal', '#1f8a8a'], ['Turquoise', '#2ec4c4'], ['Aqua', '#7fdbe0'],
  ['Sky blue', '#6fb7e9'], ['Blue', '#3b6fd1'], ['Royal blue', '#2a4bb5'], ['Navy', '#1b2a5e'], ['Indigo', '#3f3a8f'], ['Violet', '#7e57c2'], ['Purple', '#6a3d9a'], ['Lavender', '#b8a4e3'], ['Plum', '#6b2d5c'],
  ['Brown', '#7b4a2a'], ['Chocolate', '#4a2c1a'], ['Tan', '#c9a27a'], ['Sand', '#e0c9a0'], ['Beige', '#e8dcc0'], ['Copper', '#b87333'], ['Bronze', '#8c6a2f'], ['Auburn', '#7a3b24'], ['Blonde', '#e6c97a'], ['Ginger', '#c4622d'], ['Hazel', '#8e6b3a'], ['Amber', '#d98e04']];
const rgb = (h) => { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h.slice(0, 6), 16); return Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [128, 128, 128]; };
const TT = T.map(([n, h]) => [n, rgb(h)]);
export function colorName(hex) { const c = rgb(hex); let best = TT[0], bd = 1e12; for (const t of TT) { const d = (t[1][0] - c[0]) ** 2 * 0.3 + (t[1][1] - c[1]) ** 2 * 0.59 + (t[1][2] - c[2]) ** 2 * 0.11; if (d < bd) { bd = d; best = t; } } return best[0]; }
// a palette (array of hex) -> "Crimson & White"
export const paletteName = (cols) => { const names = []; for (const c of cols.slice(0, 3)) { const n = colorName(c); if (!names.includes(n)) names.push(n); } return names.slice(0, 2).join(' & '); };
