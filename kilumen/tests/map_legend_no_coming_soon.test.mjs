// finish-a (Oct 30 2026): no visible "coming soon" placeholder text. Phone map legend shows the "not open" row only when a
// dot uses it, and a zone whose maps ship counts as open; terminal clerk + lifeguard lines are redrafted for Text Bot.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lines = JSON.parse(fs.readFileSync(path.join(root, 'text/overworld_lines.json'), 'utf8'));
const ui = fs.readFileSync(path.join(root, 'src/ui/ui.js'), 'utf8');
const layout = JSON.parse(fs.readFileSync(path.join(root, 'art/world/overworld/world_layout.json'), 'utf8'));

test('no coming-soon / shallows text in overworld lines', () => {
  const said = []; const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k === 'pages') said.push(...[].concat(v)); else walk(v); } };
  walk(lines);
  assert.ok(said.length > 1000);
  for (const t of said) { assert.ok(!/coming soon/i.test(String(t)), t); assert.ok(!/shallows/i.test(String(t)), t); }
  assert.notEqual(lines.system_phone.map.legend.later, 'Coming soon');
});

test('legend rows are filtered to the dots in use', () => {
  assert.match(ui, /const keys = \(\) => KEY\.filter/);
  assert.match(ui, /\$\{keys\(\)\.map\(/);
  assert.ok(!/Coming later/.test(ui));
});

test('every map-dot zone with shipped maps is open, so the not-open row stays hidden today', () => {
  const known = new Set(layout.maps_built || []);
  const isOpen = (z) => z.status === 'built' || (z.maps || []).some((m) => known.has(m));
  const closed = layout.zones.filter((z) => z.map_pos && !isOpen(z)).map((z) => z.id);
  assert.deepEqual(closed, []);
});
