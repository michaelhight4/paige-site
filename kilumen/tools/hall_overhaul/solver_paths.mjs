// Regenerates hall_v2.solver_path (arrival tile -> beat the Master's wins -> face the Master and press F) on every hall map
// from the CURRENT grid, and writes the tester's sheet. Usage: node tools/hall_overhaul/solver_paths.mjs [qa.md path]
// (Coder, Oct 30 2026). hall_v2.solution_moves stays as is: that is the puzzle model's shortest walk from the door tile 'S'
// with no battles (hall.check() asserts it), which is NOT what a player walks - they arrive one tile inside and must win.
import fs from 'node:fs';
import { solveHallFloor, replayHall, describeTokens } from '../../src/progression/hall_solver.js';
const DIR = new URL('../../art/world/overworld/maps/', import.meta.url);
export const HALL_ROUTES = [
  ['Fernwick', ['fernwick_hall_int']], ['Saltmere', ['saltmere_hall_int']], ['Mirefen', ['mirefen_hall_int']],
  ['Tidewater Coast', ['tidewater_hall_int']], ['Frostspire', ['frostspire_hall_int']], ['Cindervale', ['cindervale_hall_int']],
  ['Revival Heights', ['revival_hall_int']],
  ['Lanternport (lighthouse)', ['lanternport_lighthouse_int', 'lanternport_lighthouse_f2', 'lanternport_lighthouse_f3', 'lanternport_hall_int']],
];
const load = (n) => JSON.parse(fs.readFileSync(new URL(`${n}.json`, DIR)));
/** Solve a hall route (all floors): wins spread over floors in order until the Master's need is met. */
export function solveRoute(maps) {
  const js = maps.map(load), top = js.at(-1), tr = (m) => m.npcs.filter((n) => n.kind === 'trainer_hooded' && !n.hint_only).length;
  let left = Math.min(top.hall_v2.need_wins ?? 4, js.reduce((s, m) => s + tr(m), 0));
  return js.map((m) => { const w = Math.min(left, tr(m)), r = solveHallFloor(m, w); left -= r ? r.battles.length : 0; return { map: m.name || maps[js.indexOf(m)], mj: m, need: w, r }; });
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const out = process.argv[2] || '/workspace/kilumen/qa/hall_solver_paths.md';
  const md = ['# Hall solver paths (regenerated Oct 30 2026 from the current maps)', '',
    'Start = the tile you stand on right after walking in (one tile inside the door), facing up. World speed 1x.',
    'Each step is a key press: "Up 3" = tap Up three times (ice and push tiles may carry you further; the path accounts for that).',
    '"face Left + F" = tap Left once (you only turn: a trainer or prism is there), then press F to battle / turn it.',
    'Win every battle. Trainers you walk past may also spot you and battle first; that only adds wins.',
    'Raw tokens are U/D/L/R and A (= F). Machine copy: hall_v2.solver_path in each map json. Test: tests/hall_solver_paths.test.mjs.', ''];
  for (const [name, maps] of HALL_ROUTES) {
    md.push(`## ${name}`, '');
    for (const [i, f] of solveRoute(maps).entries()) {
      const m = f.mj, file = new URL(`${maps[i]}.json`, DIR);
      if (!f.r) { md.push(`- ${f.map}: NO PATH FOUND`, ''); continue; }
      m.hall_v2.solver_path = { start: f.r.start, facing: 'up', moves: f.r.tokens.join(''), battles: f.r.battles, end: f.r.end };
      fs.writeFileSync(file, JSON.stringify(m) + '\n');
      const last = m.hall_v2.dais_front ? 'Master: face Up + F at the dais' : `stairs up at ${f.r.end.join(',')}`;
      md.push(`### ${m.name} - start (${f.r.start.join(',')}), wins here ${f.r.battles.length}, ends: ${last}`, '',
        `Battles in order: ${f.r.battles.join(', ') || 'none'}`, '', describeTokens(f.r.tokens, m), '', '`' + f.r.tokens.join('') + '`', '');
    }
  }
  fs.mkdirSync(out.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(out, md.join('\n')); console.log('wrote', out);
}
