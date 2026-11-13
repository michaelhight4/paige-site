// Padded maps (Gary, Oct 23 2026, 10:25 AM CT): every outdoor map carries padding {dx, dy}; coordinates in older
// tests were written for the unpadded maps. pad(map, x, y) -> [x + dx, y + dy] so those tests keep their meaning.
import { readFileSync } from 'node:fs';
const cache = new Map();
export function padOf(name) {
  if (!cache.has(name)) {
    const j = JSON.parse(readFileSync(new URL(`../art/world/overworld/maps/${name}.json`, import.meta.url)));
    cache.set(name, { dx: j.padding?.dx || 0, dy: j.padding?.dy || 0 });
  }
  return cache.get(name);
}
export const pad = (name, x, y) => { const { dx, dy } = padOf(name); return [x + dx, y + dy]; };
