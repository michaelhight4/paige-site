// Hall push tiles (Coder, Oct 30 2026): the arrow painted on each push cell points the way the cell pushes.
// Checks grid char -> V2_PUSH, hall_v2.push dict, and the ha_push_<dir>__* ground tile from tileset_hallart.json agree.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const J = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const { V2_PUSH } = await import('../src/progression/puzzles.js');
const MAPS = 'art/world/overworld/maps';
const HA = new Map(J('art/world/overworld/tileset_hallart.json').tiles.map((t) => [t.id, t.name]));
const WORD = { U: 'up', D: 'down', L: 'left', R: 'right' };

test('hall arrows: grid char, push dict and painted arrow agree on every push cell', () => {
  let n = 0;
  for (const f of fs.readdirSync(MAPS).filter((f) => f.endsWith('_hall_int.json'))) {
    const m = J(`${MAPS}/${f}`), hv = m.hall_v2; if (!hv?.grid) continue;
    hv.grid.forEach((row, y) => [...row].forEach((ch, x) => {
      if (!V2_PUSH[ch]) return; n++;
      const w = WORD[V2_PUSH[ch]];
      assert.equal(hv.push?.[`${x},${y}`], w, `${f} ${x},${y} push dict`);
      const art = HA.get(m.layers.ground[y][x]) || '';
      assert.ok(art.startsWith(`ha_push_${w}__`), `${f} ${x},${y}: grid ${ch} but art ${art}`);
    }));
  }
  assert.ok(n >= 55, `push cells: ${n}`);
});
