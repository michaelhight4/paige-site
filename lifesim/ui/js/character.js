// Browser side of the layered character system: fetch layer SVGs (cached) and compose them into one SVG string.
const cache = new Map();
async function layerSvg(url) {
  if (!cache.has(url)) cache.set(url, fetch(new URL('../../' + url, import.meta.url)).then((r) => (r.ok ? r.text() : '')).catch(() => ''));
  return cache.get(url);
}
// spec = {layers:[{slot,id,cols,path}], base} as returned by adapter.getAppearance()/getLookOf()
// head-and-shoulders crop; the head sits lower on baby/child skeletons
const HEAD_Y = { baby: 52, child: 24, teen: 2, adult: 0, elder: 0 };
const headBox = (age) => `28 ${HEAD_Y[age == null ? 'adult' : age < 3 ? 'baby' : age < 13 ? 'child' : age < 20 ? 'teen' : age < 65 ? 'adult' : 'elder']} 72 72`;
export async function composeSprite(spec, { size = 128, crop = null, shadow = true } = {}) {
  const parts = await Promise.all(spec.layers.map(async (l) => { const t = await layerSvg(spec.base + l.path); if (!t) return ''; const inner = t.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''); return `<g data-layer="${l.slot}:${l.id}" style="${Object.entries(l.cols).map(([k, v]) => `--slot-${k}:${v}`).join(';')}">${inner}</g>`; }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${crop === 'head' ? headBox(spec.age) : crop === 'legs' ? '34 68 60 60' : crop === 'torso' ? '24 44 80 80' : '0 0 128 128'}" width="${size}" height="${size}" shape-rendering="crispEdges" class="char">${shadow ? '<ellipse cx="64" cy="125" rx="26" ry="3" fill="#000" fill-opacity=".18"/>' : ''}${parts.join('')}</svg>`;
}
