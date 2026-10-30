// Wild level bands (Gary Oct 30 2026 bug: L36 Kilu in Route 1 grass north of Brookhollow). The r58 level rebalance
// classified tables by zone id; legacy id sunmeadow_grass serves route1, so Route 1 got the Sunmeadow L36 band.
// tools/encounter_levels/check.py classifies by the maps a table serves and flags any slot outside its region band.
import test from 'node:test'; import assert from 'node:assert'; import fs from 'node:fs'; import { execFileSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const J = (p) => JSON.parse(fs.readFileSync(root + p, 'utf8'));
test('check.py: every wild table within its region band', () => {
  const out = execFileSync('python3', ['tools/encounter_levels/check.py', '--json'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  assert.deepEqual(JSON.parse(out), []);
});
test('route1 / route1_storm grass rolls L2-4 only', () => {
  const zones = J('data/encounters_wired.json').zones;
  for (const map of ['route1', 'route1_storm']) {
    const z = Object.values(zones).filter((z) => !z.inert && (z.maps || []).includes(map));
    assert.ok(z.length, map);
    for (const t of z) for (const s of t.slots) { const [lo, hi] = s.level; assert.ok(lo >= 2 && hi <= 4, `${map} ${s.species} ${lo}-${hi}`); }
    if (z[0].cap?.level) assert.deepEqual(z[0].cap.level, [2, 4]);
  }
});
