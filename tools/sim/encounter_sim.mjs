// Encounter-table Monte Carlo (Piscina 5.3.2 MIT + simple-statistics 7.12.1 ISC). Dev-only, Oct 23, 2026.
// Rolls every zone in art/world/overworld/encounters/encounters.json for each day phase across worker threads,
// then reports level spread and observed-vs-weight species share (flags drift > 2 points, which would mean a
// slot condition or weight bug). Partial first step toward a full battle balance sim on src/battle/engine.js.
//   node tools/sim/encounter_sim.mjs [--n 20000] [--weather clear|storm] [--json]
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(join(ROOT, 'tools/free_tools/package.json'));

export async function simulate({ n = 20000, weather = 'clear', phases = ['dawn', 'day', 'dusk', 'night'] } = {}) {
  const { Piscina } = require('piscina');
  const ss = require('simple-statistics');
  const enc = JSON.parse(readFileSync(join(ROOT, 'art/world/overworld/encounters/encounters.json'), 'utf8'));
  const pool = new Piscina({ filename: new URL('./encounter_worker.mjs', import.meta.url).href });
  const jobs = [];
  let seed = 1;
  for (const [id, zone] of Object.entries(enc.zones || {})) for (const phase of phases) jobs.push(pool.run({ id, zone, ctx: { phase, weather }, n, seed: seed++ }));
  const raw = await Promise.all(jobs);
  await pool.destroy();
  return raw.map((r) => {
    const got = r.n - r.misses, drift = [];
    for (const [sp, p] of Object.entries(r.expected)) { const obs = (r.species[sp] || 0) / (got || 1); if (Math.abs(obs - p) > 0.02) drift.push(`${sp} ${(obs * 100).toFixed(1)}% vs ${(p * 100).toFixed(1)}%`); }
    return {
      zone: r.id, phase: r.ctx.phase, rolls: r.n, empty: r.misses,
      species: Object.keys(r.species).length,
      level: r.levels.length ? { min: ss.min(r.levels), mean: +ss.mean(r.levels).toFixed(2), sd: +ss.standardDeviation(r.levels).toFixed(2), p90: ss.quantile(r.levels, 0.9), max: ss.max(r.levels) } : null,
      stepsToEncounter: { median: ss.median(r.steps), p90: ss.quantile(r.steps, 0.9) },
      drift,
    };
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const a = process.argv.slice(2);
  const opt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
  const rows = await simulate({ n: +opt('--n', 20000), weather: opt('--weather', 'clear') });
  if (a.includes('--json')) { console.log(JSON.stringify(rows, null, 2)); process.exit(0); }
  for (const r of rows) console.log(`${r.zone.padEnd(26)} ${r.phase.padEnd(5)} ${r.empty === r.rolls ? 'NO SLOTS for this phase' : `${r.species} spp  Lv ${r.level.min}-${r.level.max} mean ${r.level.mean} sd ${r.level.sd}  steps median ${r.stepsToEncounter.median} p90 ${r.stepsToEncounter.p90}`}${r.drift.length ? '  DRIFT ' + r.drift.join('; ') : ''}`);
  const empty = rows.filter((r) => r.empty === r.rolls);
  console.log(`${rows.length} zone x phase runs; ${empty.length} with no eligible slots; ${rows.filter((r) => r.drift.length).length} with weight drift > 2 pts.`);
}
