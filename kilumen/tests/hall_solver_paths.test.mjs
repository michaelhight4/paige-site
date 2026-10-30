// Every hall: the stored tester path (hall_v2.solver_path) walks door -> Master on the REAL game code (tools/hall_overhaul/
// game_sim.mjs: real key holds, trainer sight + walk-up, seat-back, trade places, slides, plates). The Oct 30 2026 playtest
// failed because the old check replayed a static puzzle model that ignored trainers moving: Cindervale ended in the arrow
// area with no battles, Tidewater had none and ended under the crystal. Each path is replayed at several key timings
// (hold / gap / pause after a battle, in 16.7 ms ticks) so it holds for a real player, not one exact rhythm.
// Regenerate with node tools/hall_overhaul/solver_paths.mjs (also writes /workspace/kilumen/qa/hall_solver_paths.md).
import test from 'node:test'; import assert from 'node:assert'; import fs from 'node:fs';
import { HALL_ROUTES } from '../tools/hall_overhaul/solver_paths.mjs';
import { walkHall } from '../tools/hall_overhaul/game_sim.mjs';
import { needWins, hallTrainers, hallWins } from '../src/progression/hall_v2.js';
const load = (n) => JSON.parse(fs.readFileSync(new URL(`../art/world/overworld/maps/${n}.json`, import.meta.url)));
const TIMINGS = [[11, 7, 90], [9, 4, 0], [14, 15, 200], [10, 3, 0]]; // 11 ticks = the tester's 190 ms hold
for (const [name, maps] of HALL_ROUTES) {
  for (const [holdTicks, gapTicks, beatTicks] of TIMINGS) {
    test(`${name}: solver path, real game code, hold ${holdTicks} gap ${gapTicks} pause ${beatTicks}: door -> wins -> Master`, async () => {
      const top = load(maps.at(-1)), beatable = maps.reduce((s, n) => s + hallTrainers(load(n)).length, 0);
      let seen = {}, flags = [];
      for (const n of maps) {
        const m = load(n), h = m.hall_v2, sp = h.solver_path;
        assert.ok(sp, `${n}: hall_v2.solver_path missing`); assert.deepEqual(sp.start, h.arrival, `${n}: path starts on the arrival tile`);
        const r = await walkHall(n, [...sp.moves], { holdTicks, gapTicks, beatTicks, seen, flags });
        seen = { ...r.sim.scene.seen }; flags = [...r.sim.scene.flags];
        if (h.dais_front) assert.deepEqual(r.end, h.dais_front, `${n}: ends at the dais`);
        else assert.equal(h.grid[r.end[1]][r.end[0]], 'G', `${n}: ends on the stairs up (at ${r.end})`);
      }
      const master = top.npcs.find((x) => x.kind === 'master');
      assert.ok(hallWins(seen, top) >= needWins(top, beatable), `${name}: hall wins ${hallWins(seen, top)} >= need`);
      assert.ok(seen[`defeated:${top.name}.${master.id}`], `${name}: the Master was battled`);
    });
  }
}
test('Tidewater: the crystal gate (15,10) is reached straight up from the corridor below, and F on it shows the wins hint', async () => {
  const r = await walkHall('tidewater_hall_int', [...'UURRRRRRRUULLUUUUA']);
  assert.deepEqual(r.end, [15, 11]); assert.equal(r.facing, 'up');
  const hint = r.sim.scene.log.find((e) => e.type === 'hall_gate_hint');
  assert.ok(hint && hint.gate === 'd', 'gate hint logged'); assert.ok(r.sim.scene.log.some((e) => e.type === 'say' && /Hall wins: \d+ of 4/.test(e.text)), 'Hall wins line shown');
});
