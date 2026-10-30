// Area name banner (Gary Oct 30 2026: "route / area names not showing top left"). Every walkable outdoor / cave map has a
// display name; the tracker fires on every map change; a sign that fires while a menu hides the HUD is held, not lost.
import test from 'node:test'; import assert from 'node:assert'; import fs from 'node:fs';
import { AreaSignTracker, areaName, signable, isInteriorMap } from '../src/overworld/area_sign.js';
const root = new URL('../', import.meta.url);
const lines = JSON.parse(fs.readFileSync(new URL('text/overworld_lines.json', root), 'utf8'));
const text = (k) => { let v = lines; for (const p of k.split('.')) v = v?.[p]; if (v && typeof v === 'object' && !Array.isArray(v)) v = v.pages; return v == null ? null : (Array.isArray(v) ? v.join('\n') : String(v)); };
const dir = new URL('art/world/overworld/maps/', root);
const maps = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(new URL(f, dir), 'utf8')));
const walkable = (j) => (j.layers?.collision || j.layers?.collide || []).length === 0 || JSON.stringify(j.layers).includes('0');
test('every walkable signable map has a display name', () => {
  const miss = [];
  for (const j of maps) {
    const m = { name: j.name, json: j };
    if (!walkable(j) || !signable(m)) continue;
    const t = areaName(m, text).title;
    if (!t || t === j.name || /\[object Object\]/.test(t)) miss.push(j.name);
  }
  assert.deepEqual(miss, []);
});
test('banner fires on each map change (route1 <-> fernwick <-> brookhollow), not for interiors', () => {
  const tr = new AreaSignTracker(); const M = (n) => ({ name: n, json: maps.find((j) => j.name === n) });
  assert.equal(tr.enter(M('brookhollow'), 0, text), areaName(M('brookhollow'), text).title);
  assert.equal(tr.enter(M('route1'), 10000, text), 'Trail 1');
  assert.ok(tr.enter(M('fernwick'), 20000, text));
  const int = maps.find((j) => isInteriorMap(j.name)); if (int) assert.equal(tr.enter(M(int.name), 25000, text), null);
  assert.equal(tr.enter(M('route1'), 40000, text), 'Trail 1');
});
test('ui.js holds a sign fired while the HUD is hidden by a menu', () => {
  const src = fs.readFileSync(new URL('src/ui/ui.js', root), 'utf8');
  assert.match(src, /_hudHidden\(\)/); assert.match(src, /this\._areaSignHeld = a/); assert.match(src, /held\.map === s\.map\.name/);
});
