// Writes hall_v2.solution_moves (door/stairs S -> stairs up / dais G) into each lighthouse floor map. Used by lighthouse.py.
import fs from 'fs';
import { hallV2FromMap } from '../../src/progression/puzzles.js';
for (const p of process.argv.slice(2)) {
  const m = JSON.parse(fs.readFileSync(p, 'utf8')), c = hallV2FromMap(m).hall.check();
  if (!c || c.softlocks) throw new Error(`${p}: ${JSON.stringify(c)}`);
  m.hall_v2.solution_moves = c.moves; fs.writeFileSync(p, JSON.stringify(m)); console.log(m.name, c.moves.length, 'moves');
}
