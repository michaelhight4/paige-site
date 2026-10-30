// Every hall: the stored tester path (hall_v2.solver_path) still walks door -> Master on the CURRENT map (Oct 30 2026 report:
// stale paths hit walls in Cindervale and stopped under a shut crystal in Tidewater). Regenerate with
// node tools/hall_overhaul/solver_paths.mjs (also writes /workspace/kilumen/qa/hall_solver_paths.md).
import test from 'node:test'; import assert from 'node:assert'; import fs from 'node:fs';
import { replayHall } from '../src/progression/hall_solver.js';
import { HALL_ROUTES, solveRoute } from '../tools/hall_overhaul/solver_paths.mjs';
import { needWins, hallTrainers } from '../src/progression/hall_v2.js';
const load = (n) => JSON.parse(fs.readFileSync(new URL(`../art/world/overworld/maps/${n}.json`, import.meta.url)));
for (const [name, maps] of HALL_ROUTES) {
  test(`${name}: solver path walks from the arrival tile, wins the Master's need and reaches the Master`, () => {
    let wins = 0; const top = load(maps.at(-1)), beatable = maps.reduce((s, n) => s + hallTrainers(load(n)).length, 0);
    for (const n of maps) {
      const m = load(n), h = m.hall_v2, sp = h.solver_path;
      assert.ok(sp, `${n}: hall_v2.solver_path missing`); assert.deepEqual(sp.start, h.arrival, `${n}: path starts on the arrival tile`);
      const r = replayHall(m, [...sp.moves]);
      assert.equal(r.trades, 0, `${n}: no slide may end against a trainer (a beaten one swaps places in the game)`);
      assert.deepEqual(r.battles, sp.battles, `${n}: battles happen as written`);
      if (h.dais_front) { assert.deepEqual([r.x, r.y], h.dais_front, `${n}: ends at the dais`); assert.equal(r.facing, 'U', 'facing the Master'); }
      else assert.equal(h.grid[r.y][r.x], 'G', `${n}: ends on the stairs up`);
      wins += r.battles.length;
    }
    assert.ok(wins >= needWins(top, beatable), `${name}: ${wins} wins >= need`);
  });
  test(`${name}: stored solver path is current (regenerated from the map matches)`, () => {
    for (const [i, f] of solveRoute(maps).entries()) assert.equal(load(maps[i]).hall_v2.solver_path?.moves, f.r.tokens.join(''), maps[i]);
  });
}
