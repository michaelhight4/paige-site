// node src/overnight/build_staged_index.mjs -> src/overnight/staged_maps.json
// Indexes World Design's overnight maps (art/world/overworld/qa/overnight_maps/). When SUMMARY.md exists only maps it
// names are listed ("finished"); before that every staged GameMap JSON is listed as a dev preview. Map data is never
// edited or copied; the game reads it in place, only with ?ov=stagedMaps.
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../..', import.meta.url).pathname;
const BASE = join(ROOT, 'art/world/overworld/qa/overnight_maps');

export function scanStaged(base = BASE, root = ROOT) {
  const found = {};
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (f === 'previews' || f === 'variants' || f === 'node_modules' || f.startsWith('.')) continue;
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!f.endsWith('.json')) continue;
      try { const j = JSON.parse(readFileSync(p, 'utf8')); if (j && j.layers && j.width && j.height && j.name) (found[j.name] ||= []).push(relative(root, p)); } catch { /* not a map */ }
    }
  };
  if (existsSync(base)) walk(base);
  const summaryPath = join(base, 'SUMMARY.md');
  const summary = existsSync(summaryPath) ? readFileSync(summaryPath, 'utf8') : null;
  const layoutPath = join(root, 'art/world/overworld/world_layout.json');
  const live = new Set(existsSync(layoutPath) ? JSON.parse(readFileSync(layoutPath, 'utf8')).maps_built || [] : []);
  const maps = {};
  for (const [name, paths] of Object.entries(found)) {
    if (live.has(name)) continue; // a staged copy of a live map never shadows the live one
    if (summary ? !new RegExp('\\b' + name + '\\b').test(summary) : name.startsWith('x_')) continue; // x_* = sandbox testbeds
    if (!summary && !paths.some((p) => /maps(_new)?\//.test(p))) continue;
    maps[name] = paths.sort((a, b) => statSync(join(root, b)).mtimeMs - statSync(join(root, a)).mtimeMs)[0]; // newest copy
  }
  return { generated: new Date().toISOString(), summary: !!summary, maps };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const idx = scanStaged();
  writeFileSync(new URL('./staged_maps.json', import.meta.url), JSON.stringify(idx, null, 1) + '\n');
  console.log(`staged maps: ${Object.keys(idx.maps).length} (${idx.summary ? 'SUMMARY.md' : 'no SUMMARY.md: dev preview'})`, Object.keys(idx.maps).join(', '));
}
